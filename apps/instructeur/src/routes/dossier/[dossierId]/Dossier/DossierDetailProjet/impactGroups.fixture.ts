import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";
import type { DossierFull, FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

export function impact(overrides: Partial<FrontEndImpactOnEspece> = {}): FrontEndImpactOnEspece {
  return {
    espece: {
      CD_REF: "2437",
      nomVernaculaire: "Fou de Bassan",
      nomScientifique: "Morus bassanus",
      especeCNPN: true,
      especeMinisterielle: false,
    },
    typeImpact: {
      identifiantPitchou: "P-1",
      libelle: "Destruction/mutilation de spécimens",
      criteriaAllowed: ["Nombre d'individus"],
    },
    methode: null,
    moyenDePoursuite: null,
    nombreIndividus: "11-100",
    nids: null,
    oeufs: null,
    surfaceHabitatDetruit: null,
    ...overrides,
  };
}

export const habitat = impact({
  typeImpact: {
    identifiantPitchou: "P-4-2",
    libelle: "Dégradation/destruction d'aires de repos/reproduction",
    criteriaAllowed: ["Surface habitat détruit (m²)"],
  },
  nombreIndividus: null,
  surfaceHabitatDetruit: 120,
});

export function groupChange(id: string | null, label = id ?? "Impact non renseigné"): FieldChange {
  return {
    field: speciesImpactChangeField(id),
    label,
    revisions: [`revision-${id}` as ActionDossierId],
    detected_at: new Date("2026-09-01"),
    modified_at: null,
  };
}

export function speciesDossier(impacts = [impact(), habitat]): DossierFull {
  return {
    id: 123,
    name: "Projet",
    source: "pitchou",
    especesImpactees: { impacts, sourceFile: undefined },
    piecesJointesPetitionnaires: [],
  } as unknown as DossierFull;
}
