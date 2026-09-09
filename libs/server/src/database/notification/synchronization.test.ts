import { afterEach, beforeEach, expect, test, vi } from "vitest";
import knex, { type Knex } from "knex";
import { syncIdentitesDossier } from "../identite_dossier.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "../especes_impactees.ts";
import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 } from "../edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type IdentiteDossier from "@pitchou/types/database/public/IdentiteDossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

vi.mock("../fichier.ts", () => ({
  deleteFichiersWithoutOtherReferences: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../impact_espece/dumpImpactEspeceFromFichier.ts", () => ({
  dumpImpactEspeceFromFichier: vi.fn().mockResolvedValue([]),
}));

const dossier = 1 as DossierId;
const file = "00000000-0000-4000-8000-000000000001" as FileId;
let db: Knex;
let identities: IdentiteDossier[];
let speciesFile: FileId | null;
let edges: { dossier: DossierId; fichier: FileId; name: string; checksum: string }[];
let queries: { sql: string; values: unknown[] }[];

beforeEach(() => {
  identities = [];
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
      if (sql.includes('from "identite_dossier"') && sql.startsWith("select")) rows = identities;
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

test("the first identity added to an existing empty dossier is a revision, replay is not", async () => {
  const identity = { type: "demandeur", email: "demandeur@test.fr" };
  expect(await syncIdentitesDossier(new Map([[dossier, [identity]]]), db)).toEqual(
    new Set([dossier]),
  );
  expect(loggedChanges()).toEqual([
    {
      field: "Demandeur : Adresse électronique",
      label: "Demandeur : Adresse électronique",
      notification_field: "demandeur.email",
      from: null,
      to: "demandeur@test.fr",
      notification: true,
    },
  ]);
  expect(queries[0].sql).toMatch(/^BEGIN/);
  expect(queries.at(-1)?.sql).toMatch(/^COMMIT/);
  identities = [{ ...identity, dossier } as IdentiteDossier];
  queries = [];
  expect(await syncIdentitesDossier(new Map([[dossier, [identity]]]), db)).toEqual(new Set());
  expect(loggedChanges()).toEqual([]);
});

test.each(["demandeur", "mandataire", "representant"])(
  "%s revisions identify only changed properties and retain before/after values",
  async (type) => {
    identities = [
      {
        dossier,
        type,
        first_names: "Camille",
        last_name: "Martin",
        email: "avant@test.fr",
        phone: "0102030405",
        role: "Responsable",
      } as IdentiteDossier,
    ];
    const incoming = { ...identities[0], email: "apres@test.fr", phone: "0504030201", role: null };
    await syncIdentitesDossier(new Map([[dossier, [incoming]]]), db);
    const changes = loggedChanges();
    expect(changes.map(({ notification_field }) => notification_field)).toEqual([
      `${type}.email`,
      `${type}.phone`,
      `${type}.role`,
    ]);
    expect(changes.map(({ from, to }) => ({ from, to }))).toEqual([
      { from: "avant@test.fr", to: "apres@test.fr" },
      { from: "0102030405", to: "0504030201" },
      { from: "Responsable", to: null },
    ]);
    expect(changes.every(({ notification }) => notification === true)).toBe(true);
  },
);

test("first and last names have independent stable revision keys", async () => {
  identities = [
    { dossier, type: "demandeur", first_names: "Camille", last_name: "Martin" } as IdentiteDossier,
  ];
  await syncIdentitesDossier(new Map([[dossier, [{ ...identities[0], last_name: "Durand" }]]]), db);
  expect(loggedChanges()).toEqual([
    {
      field: "Demandeur : Nom",
      label: "Demandeur : Nom",
      notification_field: "demandeur.last_name",
      from: "Martin",
      to: "Durand",
      notification: true,
    },
  ]);
});

test("the first species file added later notifies, replay does not, and clearing reopens review", async () => {
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
