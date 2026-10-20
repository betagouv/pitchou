import { afterEach, beforeEach, expect, test, vi } from "vitest";
import knex, { type Knex } from "knex";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "../especes_impactees.ts";
import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 } from "../edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

vi.mock("../fichier.ts", () => ({
  deleteFichiersWithoutOtherReferences: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../impact_espece/dumpImpactEspeceFromFichier.ts", () => ({
  dumpImpactEspeceFromFichier: vi.fn().mockResolvedValue([{ message: "Unstructured test file" }]),
}));

const dossier = 1 as DossierId;
const file = "00000000-0000-4000-8000-000000000001" as FileId;
let db: Knex;
let speciesFile: FileId | null;
let edges: { dossier: DossierId; fichier: FileId; name: string; checksum: string }[];
let queries: { sql: string; values: unknown[] }[];

beforeEach(() => {
  speciesFile = null;
  edges = [];
  queries = [];
  db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(
      config: { text: string; values?: unknown[] },
      callback: (error: null, result: object) => void,
    ) {
      const { text: sql, values = [] } = config;
      queries.push({ sql, values });
      let rows: object[] = [];
      if (sql.includes('from "dossier"') && sql.startsWith('select "id"'))
        rows = [{ id: dossier, demarche_numerique_number: "101", especes_impactees: speciesFile }];
      if (sql.includes('from "dossier"') && sql.startsWith('select "especes_impactees"'))
        rows = speciesFile ? [{ especes_impactees: speciesFile }] : [];
      if (
        sql.includes('from "edge_dossier__fichier_pieces_jointes_petitionnaire"') &&
        sql.startsWith("select")
      )
        rows = edges;
      if (sql.includes('from "file"') && sql.startsWith("select"))
        rows = [{ id: file, name: "plan.pdf" }];
      callback(null, { rows, rowCount: rows.length, command: sql.split(" ")[0].toUpperCase() });
    },
  });
  db.client.releaseConnection = async () => {};
});
afterEach(async () => {
  await db.destroy();
});

function loggedChanges() {
  return queries
    .filter(({ sql }) => sql.startsWith('insert into "action_dossier"'))
    .flatMap(({ values }) =>
      values.filter((value): value is string => typeof value === "string" && value.startsWith("{")),
    )
    .map((json) => JSON.parse(json));
}

test("coarse species files added later notify, replay does not, and clearing reopens review", async () => {
  const ids = new Map([[101, dossier]]);
  expect(
    await synchronizeFichiersEspecesImpacteesFromDS88444(new Map([[101, file]]), ids, db),
  ).toEqual(new Set([dossier]));
  expect(loggedChanges()).toMatchObject([{ field: "especes", notification: true }]);
  speciesFile = file;
  queries = [];
  expect(
    await synchronizeFichiersEspecesImpacteesFromDS88444(new Map([[101, file]]), ids, db),
  ).toEqual(new Set());
  expect(loggedChanges()).toEqual([]);
  expect(
    await synchronizeFichiersEspecesImpacteesFromDS88444(new Map([[101, null]]), ids, db),
  ).toEqual(new Set([dossier]));
  expect(loggedChanges()).toMatchObject([{ field: "especes", notification: true }]);
  expect(queries.some(({ sql }) => sql.startsWith('delete from "impact_espece"'))).toBe(true);
});

test("the first attachment added later notifies, unchanged links do not, and removal is a revision", async () => {
  const field = "Diagnostic écologique";
  const source = [
    {
      number: 101,
      champs: [{ id: "files", label: field, files: [{ checksum: "checksum" }] }],
      annotations: [],
    },
  ] as unknown as DossierDS88444[];
  const run = (files: FileId[], dossiers = source) =>
    synchronizeFichiersPiecesJointesPetitionnaireFromDS88444(
      new Map([[dossier, files]]),
      dossiers,
      new Map([[101, dossier]]),
      new Map([[field, "files"]]),
      [field],
      db,
    );
  expect(await run([file])).toEqual(new Set([dossier]));
  expect(loggedChanges()).toMatchObject([
    { notification: true, notification_field: `piece:${file}` },
  ]);
  edges = [{ dossier, fichier: file, name: "plan.pdf", checksum: "checksum" }];
  queries = [];
  expect(await run([file])).toEqual(new Set());
  expect(loggedChanges()).toEqual([]);
  expect(
    await run([], [{ number: 101, champs: [], annotations: [] }] as unknown as DossierDS88444[]),
  ).toEqual(new Set([dossier]));
  expect(loggedChanges()).toMatchObject([
    { field: "plan.pdf", notification_field: `piece:${file}`, to: null, notification: true },
  ]);
});
