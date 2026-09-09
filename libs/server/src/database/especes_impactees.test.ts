import { afterEach, beforeEach, expect, test, vi } from "vitest";
import knex, { type Knex } from "knex";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "./especes_impactees.ts";
import { dumpImpactEspeceFromFichier } from "./impact_espece/dumpImpactEspeceFromFichier.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { dossier, oldFile, newFile, impact, changes } from "./especes_impactees.fixture.ts";
import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

vi.mock("./impact_espece/dumpImpactEspeceFromFichier.ts", () => ({
  dumpImpactEspeceFromFichier: vi.fn(),
}));
vi.mock("./fichier.ts", () => ({
  deleteFichiersWithoutOtherReferences: vi.fn().mockResolvedValue([]),
}));

let db: Knex;
let pointer: FileId | null;
let impacts: ImpactEspece[];
let incoming: ImpactEspece[];
let anomalies: AnomalieFichierEspeces[];
let failNotification: boolean;
let queries: { sql: string; values: unknown[] }[];

beforeEach(() => {
  pointer = oldFile;
  impacts = [impact(), impact("P-4-2")];
  incoming = impacts.map((row) => ({ ...row, source_file: newFile }));
  anomalies = [];
  queries = [];
  failNotification = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(dumpImpactEspeceFromFichier).mockImplementation(async (_id, _file, trx) => {
    expect(trx?.isTransaction).toBe(true);
    impacts = incoming;
    return anomalies;
  });
  db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(
      config: { text: string; values?: unknown[] },
      callback: (error: Error | null, result?: object) => void,
    ) {
      const { text: sql, values = [] } = config;
      queries.push({ sql, values });
      let rows: object[] = [];
      if (sql.startsWith("select") && sql.includes('from "dossier"'))
        rows = [{ id: dossier, demarche_numerique_number: "101", especes_impactees: pointer }];
      if (sql.startsWith("select") && sql.includes('from "impact_espece"')) rows = [...impacts];
      if (sql.startsWith("select") && sql.includes('from "impact_type"'))
        rows = [
          { identifiant_pitchou: "P-2-1", libelle_pitchou: "Capture" },
          { identifiant_pitchou: "P-4-2", libelle_pitchou: "Habitat" },
        ];
      if (sql.startsWith('update "dossier"')) pointer = values[0] as FileId | null;
      if (sql.startsWith('delete from "impact_espece"'))
        impacts = sql.includes("source_file")
          ? impacts.filter((row) => row.source_file === values[1])
          : [];
      if (sql.startsWith('insert into "action_dossier"') && failNotification)
        return callback(new Error("notification insert failed"));
      callback(null, { rows, rowCount: rows.length, command: sql.split(" ")[0].toUpperCase() });
    },
  });
  db.client.releaseConnection = async () => {};
});

afterEach(async () => {
  await db.destroy();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const synchronize = (file: FileId | null = newFile) =>
  synchronizeFichiersEspecesImpacteesFromDS88444(
    new Map([[101, file]]),
    new Map([[101, dossier]]),
    db,
  );

test("quantity change creates one group action in the locked replacement transaction", async () => {
  incoming[0] = { ...incoming[0], nombre_individus: "1-10" };
  expect(await synchronize()).toEqual(new Set([dossier]));
  expect(changes(queries)).toEqual([
    {
      field: "especes",
      notification_field: "especes:impact_type:P-2-1",
      label: "Capture",
      notification: true,
    },
  ]);
  expect(queries[0].sql).toMatch(/^BEGIN/);
  expect(queries[1].sql).toContain('order by "id" asc for update');
  expect(queries[2].sql).toContain('from "impact_espece"');
  expect(queries.at(-1)?.sql).toMatch(/^COMMIT/);
  expect(deleteFichiersWithoutOtherReferences).toHaveBeenCalledWith(
    [oldFile],
    expect.objectContaining({ isTransaction: true }),
  );
});

test("identical reordered impacts from a different file do not notify", async () => {
  incoming.reverse();
  expect(await synchronize()).toEqual(new Set());
  expect(changes(queries)).toEqual([]);
  expect(pointer).toBe(newFile);
  expect(impacts.every(({ source_file }) => source_file === newFile)).toBe(true);
});

test("deleting the file keeps each deleted group's key and readable label", async () => {
  expect(await synchronize(null)).toEqual(new Set([dossier]));
  expect(changes(queries)).toEqual([
    {
      field: "especes",
      notification_field: "especes:impact_type:P-2-1",
      label: "Capture",
      notification: true,
    },
    {
      field: "especes",
      notification_field: "especes:impact_type:P-4-2",
      label: "Habitat",
      notification: true,
    },
  ]);
  expect(impacts).toEqual([]);
});

test("first species added later to an existing empty dossier are group revisions", async () => {
  pointer = null;
  impacts = [];
  expect(await synchronize()).toEqual(new Set([dossier]));
  expect(changes(queries).map(({ notification_field }) => notification_field)).toEqual([
    "especes:impact_type:P-2-1",
    "especes:impact_type:P-4-2",
  ]);
});

test("unspecified impact rows use their own group, not the coarse file key", async () => {
  impacts = [impact(null)];
  await synchronize(null);
  expect(changes(queries)[0]).toMatchObject({
    notification_field: "especes:impact_type:unspecified",
    label: "Type d'impact non renseigné",
  });
});

test.each(["missing", "wrong source", "failed import", "partial import"])(
  "%s keeps coarse review without invented additions or deletions",
  async (reason) => {
    if (reason === "missing") impacts = [];
    if (reason === "wrong source")
      impacts = impacts.map((row) => ({ ...row, source_file: newFile }));
    if (reason === "failed import") {
      incoming = [];
      anomalies = [{ message: "unreadable" }];
    }
    if (reason === "partial import") {
      incoming = incoming.slice(1);
      anomalies = [{ ligne: 2, message: "unknown species" }];
    }
    expect(await synchronize()).toEqual(new Set([dossier]));
    expect(changes(queries)).toEqual([
      { field: "especes", label: "Espèces impactées", notification: true },
    ]);
  },
);

test("same-file materialization or replay never creates applicant revisions", async () => {
  impacts = [];
  incoming = [impact()];
  expect(await synchronize(oldFile)).toEqual(new Set());
  expect(changes(queries)).toEqual([]);
  expect(impacts).toHaveLength(1);
  expect(await synchronize(oldFile)).toEqual(new Set());
  expect(changes(queries)).toEqual([]);
});

test("an unreadable replacement clears stale rows even if the previous file stays shared", async () => {
  incoming = impacts;
  anomalies = [{ message: "storage unavailable" }];
  await synchronize();
  expect(impacts).toEqual([]);
  expect(changes(queries)).toEqual([
    { field: "especes", label: "Espèces impactées", notification: true },
  ]);
});

test("notification write failure rejects and rolls back instead of committing impacts alone", async () => {
  incoming[0] = { ...incoming[0], nombre_individus: "1-10" };
  failNotification = true;
  await expect(synchronize()).rejects.toThrow("notification insert failed");
  expect(queries.at(-1)?.sql).toMatch(/^ROLLBACK/);
  expect(deleteFichiersWithoutOtherReferences).not.toHaveBeenCalled();
});
