import { beforeEach, expect, test, vi } from "vitest";
import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { prepareImpactEspeceFile } from "@pitchou/server/database/impact_espece/prepareImpactEspeceFile.ts";
import { prepareDossierFiles } from "./synchronizeDossierFiles.ts";

vi.mock("@pitchou/server/database/impact_espece/prepareImpactEspeceFile.ts", () => ({
  prepareImpactEspeceFile: vi.fn(),
}));

// These imports perform no work during preparation.
vi.mock(
  "@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts",
  () => ({}),
);
vi.mock("@pitchou/server/database/especes_impactees.ts", () => ({}));
vi.mock("./synchronization-dossier-88444.ts", () => ({}));

beforeEach(() => vi.clearAllMocks());

function database(imported: { demarche_numerique_number: string; source_file: FileId }[] = []) {
  return vi.fn(() => ({
    join: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockResolvedValue(imported),
  })) as unknown as Knex.Transaction;
}

test("preparation waits for attachments and parses each species file once before returning", async () => {
  const file = "00000000-0000-4000-8000-000000000001" as FileId;
  const attachments = Promise.withResolvers<Map<number, FileId[]>>();
  const storage = Promise.withResolvers<{ anomalies: [] }>();
  const reading = Promise.withResolvers<void>();
  vi.mocked(prepareImpactEspeceFile).mockImplementationOnce(() => {
    reading.resolve();
    return storage.promise;
  });
  let completed = false;
  const preparation = prepareDossierFiles(
    {
      especesImpactees: Promise.resolve(
        new Map([
          [101, file],
          [102, file],
        ]),
      ),
      piecesJointesPetitionnaire: attachments.promise,
    },
    database(),
  ).then((result) => {
    completed = true;
    return result;
  });
  await Promise.resolve();
  expect(completed).toBe(false);
  attachments.resolve(new Map());
  await reading.promise;
  expect(completed).toBe(false);
  storage.resolve({ anomalies: [] });
  const result = await preparation;
  expect(prepareImpactEspeceFile).toHaveBeenCalledOnce();
  expect(result.preparedFiles.get(file)).toEqual({ anomalies: [] });
});

test("preparation skips imported dossier/file pairs but prepares changed, missing and shared imports", async () => {
  const stable = "00000000-0000-4000-8000-000000000001" as FileId;
  const changed = "00000000-0000-4000-8000-000000000002" as FileId;
  const shared = "00000000-0000-4000-8000-000000000003" as FileId;
  const missing = "00000000-0000-4000-8000-000000000004" as FileId;
  vi.mocked(prepareImpactEspeceFile).mockResolvedValue({ anomalies: [] });
  const result = await prepareDossierFiles(
    {
      especesImpactees: Promise.resolve(
        new Map([
          [101, stable],
          [102, changed],
          [103, shared],
          [104, shared],
          [105, missing],
        ]),
      ),
      piecesJointesPetitionnaire: Promise.resolve(new Map()),
    },
    database([
      { demarche_numerique_number: "101", source_file: stable },
      { demarche_numerique_number: "102", source_file: stable },
      { demarche_numerique_number: "103", source_file: shared },
    ]),
  );
  expect(vi.mocked(prepareImpactEspeceFile).mock.calls.map(([file]) => file)).toEqual([
    changed,
    shared,
    missing,
  ]);
  expect(result.preparedFiles.has(stable)).toBe(false);
  expect(result.especesImpactees?.get(101)).toBe(stable);
});
