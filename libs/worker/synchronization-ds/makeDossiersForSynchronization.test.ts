import { describe, expect, it } from "vitest";

import type { AdditionalDataForDossierCreation } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import { mapPersistedAdditionalData } from "./makeDossiersForSynchronization.ts";

describe("mapPersistedAdditionalData", () => {
  it("keeps current additional-data keys", () => {
    const timestamp = new Date("2026-01-02T10:00:00Z");
    const signatureDate = new Date("2026-01-03T10:00:00Z");
    const value: AdditionalDataForDossierCreation = {
      dossier: { name: "Current dossier", depot_date: timestamp },
      evenement_phase_dossier: [{ phase: "Instruction", timestamp }],
      decision_administrative: [{ number: "AP-001", signature_date: signatureDate }],
      followers: [{ email: "current@example.test", last_name: "Martin" }],
    };

    expect(mapPersistedAdditionalData(value)).toMatchObject({
      dossier: { name: "Current dossier" },
      evenement_phase_dossier: [{ phase: "Instruction", timestamp }],
      decision_administrative: [{ number: "AP-001", signature_date: signatureDate }],
      followers: [{ email: "current@example.test", last_name: "Martin" }],
    });
  });

  it("translates legacy additional-data keys", () => {
    const timestamp = new Date("2025-01-02T10:00:00Z");
    const signatureDate = new Date("2025-01-03T10:00:00Z");
    const value: AdditionalDataForDossierCreation = {
      dossier: { nom: "Legacy dossier", date_dépôt: timestamp },
      évènement_phase_dossier: [{ phase: "Instruction", horodatage: timestamp }],
      décision_administrative: [{ numéro: "AP-002", date_signature: signatureDate }],
      personnes_qui_suivent: [{ email: "legacy@example.test", nom: "Dupont" }],
    };

    expect(mapPersistedAdditionalData(value)).toMatchObject({
      dossier: { name: "Legacy dossier" },
      evenement_phase_dossier: [{ phase: "Instruction", timestamp }],
      decision_administrative: [{ number: "AP-002", signature_date: signatureDate }],
      followers: [{ email: "legacy@example.test", last_name: "Dupont" }],
    });
  });
});
