import { beforeEach, expect, test, vi } from "vitest";
import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 } from "@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import { prepareImpactEspeceFile } from "@pitchou/server/database/impact_espece/prepareImpactEspeceFile.ts";
import {
  getFichiersEspecesImpactees88444,
  getPiecesJointesPetitionnaire88444,
} from "./synchronization-dossier-88444.ts";
import {
  prepareDossierFiles,
  startDossierFileDownloads,
  synchronizeDownloadedDossierFiles,
} from "./synchronizeDossierFiles.ts";

vi.mock("@pitchou/server/database/impact_espece/prepareImpactEspeceFile.ts", () => ({
  prepareImpactEspeceFile: vi.fn(),
}));

vi.mock("@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts", () => ({
  synchronizeFichiersPiecesJointesPetitionnaireFromDS88444: vi.fn(),
}));
vi.mock("@pitchou/server/database/especes_impactees.ts", () => ({
  synchronizeFichiersEspecesImpacteesFromDS88444: vi.fn(),
}));
vi.mock("./synchronization-dossier-88444.ts", () => ({
  getFichiersEspecesImpactees88444: vi.fn(),
  getPiecesJointesPetitionnaire88444: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function database(imported: { demarche_numerique_number: string; source_file: FileId }[] = []) {
  return vi.fn(() => ({
    join: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockResolvedValue(imported),
  })) as unknown as Knex.Transaction;
}

test("file categories finish their database work before the next category starts", async () => {
  const finished = Promise.withResolvers<Map<number, FileId>>();
  vi.mocked(getFichiersEspecesImpactees88444).mockReturnValueOnce(finished.promise);
  vi.mocked(getPiecesJointesPetitionnaire88444).mockResolvedValueOnce(new Map());
  const downloading = startDossierFileDownloads([], 88444, new Map(), database());
  try {
    expect(getFichiersEspecesImpactees88444).toHaveBeenCalledOnce();
    expect(getPiecesJointesPetitionnaire88444).not.toHaveBeenCalled();
  } finally {
    finished.resolve(new Map());
    await downloading;
  }
  expect(getPiecesJointesPetitionnaire88444).toHaveBeenCalledOnce();
});

test("preparation parses each species file once before returning", async () => {
  const file = "00000000-0000-4000-8000-000000000001" as FileId;
  const storage = Promise.withResolvers<{ anomalies: [] }>();
  const reading = Promise.withResolvers<void>();
  vi.mocked(prepareImpactEspeceFile).mockImplementationOnce(() => {
    reading.resolve();
    return storage.promise;
  });
  let completed = false;
  const preparation = prepareDossierFiles(
    {
      especesImpactees: new Map([
        [101, file],
        [102, file],
      ]),
      piecesJointesPetitionnaire: new Map(),
    },
    database(),
  ).then((result) => {
    completed = true;
    return result;
  });
  await Promise.resolve();
  expect(completed).toBe(false);
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
      especesImpactees: new Map([
        [101, stable],
        [102, changed],
        [103, shared],
        [104, shared],
        [105, missing],
      ]),
      piecesJointesPetitionnaire: new Map(),
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

test("attachment writes wait for species writes on the shared transaction", async () => {
  const file = "00000000-0000-4000-8000-000000000001" as FileId;
  const finished = Promise.withResolvers<Set<DossierId>>();
  vi.mocked(synchronizeFichiersEspecesImpacteesFromDS88444).mockReturnValueOnce(finished.promise);
  vi.mocked(synchronizeFichiersPiecesJointesPetitionnaireFromDS88444).mockResolvedValueOnce(
    new Set(),
  );
  const synchronization = synchronizeDownloadedDossierFiles(
    {
      especesImpactees: new Map([[101, file]]),
      piecesJointesPetitionnaire: new Map(),
      preparedFiles: new Map(),
    },
    [],
    new Map(),
    new Map(),
    database(),
  );
  try {
    expect(synchronizeFichiersEspecesImpacteesFromDS88444).toHaveBeenCalledOnce();
    expect(synchronizeFichiersPiecesJointesPetitionnaireFromDS88444).not.toHaveBeenCalled();
  } finally {
    finished.resolve(new Set());
    await synchronization;
  }
  expect(synchronizeFichiersPiecesJointesPetitionnaireFromDS88444).toHaveBeenCalledOnce();
});
