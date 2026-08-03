import { describe, expect, it } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

import { formatPorteurDeProjet } from "./displayDossier.ts";

describe("formatPorteurDeProjet", () => {
  it("uses the SIRET when a legal name is unavailable", () => {
    const dossier = {
      demandeur_personne_morale_siret: "12345678901234",
      demandeur_personne_morale_legal_name: null,
    } as unknown as DossierSummary;

    expect(formatPorteurDeProjet(dossier)).toBe("SIRET 12345678901234");
  });
});
