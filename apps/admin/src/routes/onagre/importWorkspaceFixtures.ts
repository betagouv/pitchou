import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";

const snapshot = {
  id: 1,
  filename: "onagre-test.json",
  fingerprint: "snapshot-hash",
  created_at: new Date("2026-10-25"),
  tables: [],
  records_complete: true,
};
export const data = {
  selected: snapshot,
  snapshots: [snapshot],
  importEnabled: true,
  importRuns: [],
  importJobs: [],
};
export function makePreview(): OnagreImportPreview {
  return {
    previewId: "test-preview",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    sourceInstance: "onagre-test",
    snapshotId: 1,
    snapshotFingerprint: "snapshot-hash",
    mappingHash: "mapping-hash",
    inputHash: "input-hash",
    targetHash: "target-hash",
    policy: {
      version: "1",
      title: "Premier import",
      description: "Reprise de l'identité et de la réception.",
      omissions: ["Pièces jointes non reprises"],
    },
    availability: { enabled: true, reason: null },
    records: (["ready", "blocked", "already_imported", "conflict"] as const).map(
      (status, index) => ({
        recordId: String(index + 1),
        code: `CODE-${index}`,
        name: `Projet ${index}`,
        receptionDate: "2020-01-02",
        status,
        issues: status === "blocked" ? ["Date de réception manquante"] : [],
        omissions: [],
        sourceHash: "source-hash",
        targetHash: "target-hash",
        dossierId: status === "already_imported" ? 80 : null,
      }),
    ),
  };
}
