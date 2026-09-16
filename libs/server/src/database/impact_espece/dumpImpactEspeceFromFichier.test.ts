import { Readable } from "node:stream";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import knex, { type Knex } from "knex";
import {
  ods,
  especeByCD_REF,
  referentiel,
} from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.fixture.ts";
import { dumpImpactEspeceFromFichier } from "./dumpImpactEspeceFromFichier.ts";
import { getFile } from "../file.ts";
import { getObject } from "../../objectStorage.ts";
import { loadEspeceByCD_REF } from "../../especeProtegee.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "../../referentielTypeImpactMethodeMoyenDePoursuite.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";

vi.mock("../file.ts", () => ({ getFile: vi.fn() }));
vi.mock("../../objectStorage.ts", () => ({
  getObject: vi.fn(),
  fileKey: (id: string) => `files/${id}`,
}));
vi.mock("../../especeProtegee.ts", () => ({ loadEspeceByCD_REF: vi.fn() }));
vi.mock("../../referentielTypeImpactMethodeMoyenDePoursuite.ts", () => ({
  getReferentielTypeImpactMethodeMoyenDePoursuite: vi.fn(),
}));

const dossier = 1 as DossierId;
const file = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "species.ods",
  media_type: "application/vnd.oasis.opendocument.spreadsheet",
} as File;
let db: Knex;
let queries: string[];
let insertError: Error | undefined;
let alreadyImported: boolean;

beforeEach(async () => {
  queries = [];
  insertError = undefined;
  alreadyImported = false;
  vi.mocked(getFile).mockResolvedValue(file);
  vi.mocked(loadEspeceByCD_REF).mockResolvedValue(especeByCD_REF);
  vi.mocked(getReferentielTypeImpactMethodeMoyenDePoursuite).mockResolvedValue(referentiel);
  const bytes = await ods(
    ["CD_REF", "identifiant pitchou activité", "nombre individus"],
    [["2437", "P-2-1", "11-100"]],
  );
  vi.mocked(getObject).mockResolvedValue({ body: Readable.from(Buffer.from(bytes)) });
  db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(config: { text: string }, callback: (error: Error | null, result?: object) => void) {
      const sql = config.text;
      queries.push(sql);
      if (sql.startsWith('insert into "impact_espece"') && insertError)
        return callback(insertError);
      const rows =
        sql.startsWith('select "id" from "impact_espece"') && alreadyImported ? [{ id: "1" }] : [];
      callback(null, { rows, rowCount: rows.length, command: sql.split(" ")[0].toUpperCase() });
    },
  });
  db.client.releaseConnection = async () => {};
});

afterEach(async () => {
  await db.destroy();
  vi.resetAllMocks();
});

test("standalone imports lock and replace rows atomically, retaining the anomaly-array API", async () => {
  expect(await dumpImpactEspeceFromFichier(dossier, file.id, db)).toEqual([]);
  expect(queries[0]).toMatch(/^BEGIN/);
  expect(queries[1]).toContain("for update");
  expect(queries.findIndex((sql) => sql.startsWith('delete from "impact_espece"'))).toBeLessThan(
    queries.findIndex((sql) => sql.startsWith('insert into "impact_espece"')),
  );
  expect(queries.at(-1)).toMatch(/^COMMIT/);
});

test("database replacement errors propagate and roll back, never masquerading as anomalies", async () => {
  insertError = new Error("impact insert failed");
  await expect(dumpImpactEspeceFromFichier(dossier, file.id, db)).rejects.toThrow(
    "impact insert failed",
  );
  expect(queries.at(-1)).toMatch(/^ROLLBACK/);
});

test("database read errors also propagate", async () => {
  vi.mocked(getFile).mockRejectedValue(new Error("database unavailable"));
  await expect(dumpImpactEspeceFromFichier(dossier, file.id, db)).rejects.toThrow(
    "database unavailable",
  );
  expect(queries.at(-1)).toMatch(/^ROLLBACK/);
});

test("object storage failures remain file anomalies", async () => {
  vi.mocked(getObject).mockRejectedValue(new Error("object unavailable"));
  expect(await dumpImpactEspeceFromFichier(dossier, file.id, db)).toEqual([
    { message: expect.stringContaining("object unavailable") },
  ]);
  expect(queries.some((sql) => sql.startsWith("delete"))).toBe(false);
});

test("malformed spreadsheets return anomalies, not a successful empty import", async () => {
  vi.mocked(getObject).mockResolvedValue({ body: Readable.from("not a spreadsheet") });
  const anomalies = await dumpImpactEspeceFromFichier(dossier, file.id, db);
  expect(anomalies).toHaveLength(1);
  expect(anomalies[0].ligne).toBeUndefined();
  expect(queries.some((sql) => sql.startsWith('insert into "impact_espece"'))).toBe(false);
});

test("replaying an imported file does not read storage or replace rows", async () => {
  alreadyImported = true;
  expect(await dumpImpactEspeceFromFichier(dossier, file.id, db)).toEqual([]);
  expect(getObject).not.toHaveBeenCalled();
  expect(queries.some((sql) => sql.startsWith("delete"))).toBe(false);
});
