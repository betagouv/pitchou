import { beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue(undefined);
  const transaction = vi.fn(() => ({ insert }));
  const commit = vi.fn();
  const rollback = vi.fn();
  const database = Object.assign(
    vi.fn(() => ({ insert })),
    {
      transaction: vi.fn(async (callback) => {
        try {
          const result = await callback(transaction);
          commit();
          return result;
        } catch (error) {
          rollback();
          throw error;
        }
      }),
    },
  );
  return {
    insert,
    transaction,
    commit,
    rollback,
    database,
    author: vi.fn(),
    access: vi.fn(),
    deleteControle: vi.fn(),
    deletePrescription: vi.fn(),
    addCommentaire: vi.fn(),
    updateCommentaire: vi.fn(),
    updateAvis: vi.fn(),
    uploadAvis: vi.fn(),
    deleteAvis: vi.fn(),
    deleteDecision: vi.fn(),
    attachment: vi.fn(),
    bulk: vi.fn(),
  };
});

export { mocks };

vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: mocks.database }));
vi.mock("$lib/server/auth", () => ({
  requireCap: () => "cap",
  requireDossierAccessByCap: mocks.access,
}));
vi.mock("@pitchou/server/database/personne.ts", () => ({ getPersonneByDossierCap: mocks.author }));
vi.mock("@pitchou/server/database/controle.ts", () => ({
  getDossierIdFromControle: async () => 42,
  deleteControle: mocks.deleteControle,
}));
vi.mock("@pitchou/server/database/prescription.ts", () => ({
  getDossierIdFromPrescription: async () => 42,
  deletePrescription: mocks.deletePrescription,
  addPrescriptionsEtControles: mocks.bulk,
}));
vi.mock("@pitchou/server/database/commentaire.ts", () => ({
  addCommentaireFromCap: mocks.addCommentaire,
  updateCommentaireFromCap: mocks.updateCommentaire,
  deleteCommentaireFromCap: vi.fn(),
  getDossierCommentaires: vi.fn(),
}));
vi.mock("@pitchou/server/database/avis_expert.ts", () => ({
  getDossierIdFromAvisExpert: async () => 42,
  addOrUpdateAvisExpert: mocks.updateAvis,
  addOrUpdateAvisExpertWithFichiers: mocks.uploadAvis,
  deleteAvisExpert: mocks.deleteAvis,
}));
vi.mock("@pitchou/server/database/decision_administrative.ts", () => ({
  getDossierIdFromDecisionAdministrative: async () => 42,
  deleteDecisionAdministrative: mocks.deleteDecision,
}));
vi.mock("@pitchou/server/database/other_attachment.ts", () => ({
  addOtherAttachment: mocks.attachment,
}));

export function event(body: unknown = {}) {
  return {
    url: new URL("http://localhost/?cap=cap"),
    params: {
      dossierId: "42",
      controleId: "controle",
      prescriptionId: "prescription",
      avisExpertId: "avis",
      decisionAdministrativeId: "decision",
    },
    request: new Request("http://localhost/", {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  } as never;
}

export function avisForm(withFile = false) {
  const form = new FormData();
  form.set("dossier", "42");
  form.set("id", "avis");
  form.set("expert", "CNPN");
  if (withFile) form.set("blobFichierAvis", new File(["avis"], "avis.pdf"));
  return form;
}

export const comment = { id: "11111111-1111-4111-8111-111111111111", content: "Comment" };
export const prescriptions = [
  { decision_administrative: "decision", article_number: "1", controles: [{ result: "Conforme" }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReset().mockResolvedValue(undefined);
  mocks.author.mockReset().mockResolvedValue({ id: 7 });
  mocks.access.mockReset().mockResolvedValue(42);
  mocks.updateCommentaire.mockReset().mockResolvedValue(true);
  mocks.addCommentaire.mockResolvedValue(comment);
  mocks.attachment.mockResolvedValue(["attachment-id"]);
  mocks.bulk.mockReset().mockResolvedValue(undefined);
});
