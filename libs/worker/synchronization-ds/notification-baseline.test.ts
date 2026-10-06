import { expect, test, vi } from "vitest";
import type { Knex } from "knex";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { prepareDossierFiles } from "./synchronizeDossierFiles.ts";
import { synchronizeDemarcheNumerique } from "./synchronizeDemarcheNumerique.ts";

const state = vi.hoisted(() => ({ identityFinished: false, filesFinished: false }));
vi.mock("@pitchou/server/database/activite.ts", () => ({
  getActiviteReferentiel: async () => ({ labels: [] }),
  registerActiviteLabels: async () => {},
}));
vi.mock("@pitchou/server/database/dossier.ts", () => ({
  getDossierIdsFromDS_Ids: async () => [
    { id: 1, demarche_numerique_number: "101", demarche_numerique_id: "old" },
  ],
  dumpDossiers: vi.fn(async () => new Set([1])),
  deleteDossierByDSNumber: async () => {},
}));
vi.mock("@pitchou/server/demarche-numerique/getAllDeletedDossiers.ts", () => ({
  default: async () => [],
}));
vi.mock("@pitchou/server/demarche-numerique/getRecentlyUpdatedDossiers.ts", () => ({
  getRecentlyUpdatedDossiers: async () => [
    { id: "old", number: 101 },
    { id: "new", number: 102 },
  ],
}));
vi.mock("./downloadNewFichiersByType.ts", () => ({
  downloadNewFichiersMotivation: async () => new Map(),
}));
vi.mock("./makeDossiersForSynchronization.ts", () => ({
  getPersonnesEntreprisesData88444: vi.fn(),
  makeDossiersForSynchronization: async () => ({
    dossiersToInitializeForSync: [{ dossier: {} }],
    dossiersToUpdateForSync: [{ dossier: {} }],
  }),
}));
vi.mock("./makeCommonDossierColumnsForSync88444.ts", () => ({
  makeCommonDossierColumnsForSync88444: vi.fn(),
}));
vi.mock("./prepareDossiersForPersistence.ts", () => ({
  prepareDossiersForPersistence: async () => ({
    dossiersToInitialize: [{}],
    dossiersChangedByEntreprises: new Set(),
    dossiersToUpdate: [{}],
  }),
}));
vi.mock("./synchronizeDossierRelations.ts", () => ({
  synchronizeDossierRelations: async () => ({
    dossierIdByDNNumber: new Map([
      [101, 1],
      [102, 2],
    ]),
    synchronizations: [],
    identitesSynchronization: Promise.resolve().then(() => {
      state.identityFinished = true;
      return new Set([1, 2]);
    }),
  }),
}));
vi.mock("./synchronizeDossierFiles.ts", () => ({
  startDossierFileDownloads: vi.fn(),
  prepareDossierFiles: vi.fn(async () => ({})),
  synchronizeDownloadedDossierFiles: () => [
    Promise.resolve(new Set([1, 2])),
    Promise.resolve().then(() => {
      state.filesFinished = true;
      return new Set([1, 2]);
    }),
  ],
}));
vi.mock("./synchronization-notification.ts", () => ({ updateNotification: vi.fn() }));

test("initial relation/file snapshots are excluded only for newly inserted dossiers, after every sync finishes", async () => {
  const whereIn = vi.fn().mockReturnThis();
  const update = vi.fn(async () => {
    expect(state.identityFinished).toBe(true);
    expect(state.filesFinished).toBe(true);
  });
  const transaction = Object.assign(
    vi.fn(() => ({
      whereIn,
      where: vi.fn().mockReturnThis(),
      whereRaw: vi.fn().mockReturnThis(),
      update,
    })),
    { raw: vi.fn((sql) => sql) },
  );
  await synchronizeDemarcheNumerique({
    apiToken: "test",
    demarcheNumber: 88444,
    lastModified: new Date(),
    pitchouKeyToChampDS: new Map(),
    pitchouKeyToAnnotationDS: new Map(),
    transaction: transaction as unknown as Knex.Transaction,
  });
  expect(transaction).toHaveBeenCalledExactlyOnceWith("action_dossier");
  expect(whereIn).toHaveBeenCalledExactlyOnceWith("dossier", [2]);
  expect(update).toHaveBeenCalledExactlyOnceWith({
    data: `(data - 'notification') || '{"baseline":true}'::jsonb`,
  });
});

test("dossier writes wait for all downloads and species file preparation", async () => {
  const ready = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  vi.mocked(dumpDossiers).mockClear();
  vi.mocked(prepareDossierFiles).mockImplementationOnce(async () => {
    started.resolve();
    await ready.promise;
    return {
      especesImpactees: undefined,
      piecesJointesPetitionnaire: new Map(),
      preparedFiles: new Map(),
    };
  });
  const transaction = Object.assign(
    vi.fn(() => ({
      whereIn: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereRaw: vi.fn().mockReturnThis(),
      update: vi.fn(),
    })),
    { raw: vi.fn() },
  );
  const synchronization = synchronizeDemarcheNumerique({
    apiToken: "test",
    demarcheNumber: 88444,
    lastModified: new Date(),
    pitchouKeyToChampDS: new Map(),
    pitchouKeyToAnnotationDS: new Map(),
    transaction: transaction as unknown as Knex.Transaction,
  });
  await started.promise;
  try {
    expect(dumpDossiers).not.toHaveBeenCalled();
  } finally {
    ready.resolve();
    await synchronization;
  }
  expect(dumpDossiers).toHaveBeenCalledOnce();
});
