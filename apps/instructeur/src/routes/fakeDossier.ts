/**
 * Dossiers for the component tests of the routes. The pages read a lot of fields
 * they do not display, so the fixtures fill in a plausible dossier and each test
 * overrides only what it is about.
 */

import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export function fakeDossierFull(overrides: Partial<DossierFull> = {}): DossierFull {
  return {
    id: 123 as DossierId,
    name: "Dossier test",
    access: "complet",
    communes: null,
    departments: ["01"],
    regions: null,
    main_activite: "Travaux",
    activite_code: "autre",
    activite_label: "Autre",
    source: "demarche_numerique",
    demarche_numerique_number: "456",
    demandeur_personne_morale_siret: null,
    demandeur_personne_morale_legal_name: "",
    representative_email: null,
    demandeur_personne_physique_last_name: "Durand",
    demandeur_personne_physique_first_names: "Alice",
    demandeur_personne_physique_email: null,
    deposant_last_name: "Durand",
    deposant_first_names: "Alice",
    deposant_email: null,
    next_action_expected_from: null,
    next_action_expected: null,
    next_due_date: null,
    enjeu: false,
    linked_to_ae_regime: false,
    onagre_demande_identifier: null,
    free_comment: "",
    latestCommentaire: null,
    ddep_required: null,
    er_mesures_sufficient: null,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
    depot_date: new Date("2026-01-15"),
    evenementsPhase: [],
    avisExpert: [],
    decisionsAdministratives: [],
    piecesJointesPetitionnaires: [],
    otherAttachments: [],
    especesImpactees: { sourceFile: undefined, impacts: [] },
    ...overrides,
  } as unknown as DossierFull;
}

/** As returned by the /dossiers route: dates are serialized strings. */
export function fakeDossierSummary(overrides: Partial<DossierSummary> = {}): DossierSummary {
  return {
    id: 123 as DossierId,
    name: "Dossier test",
    source: "demarche_numerique",
    demarche_numerique_number: "456",
    main_activite: "Travaux",
    activite_code: "autre",
    activite_label: "Autre",
    linked_to_ae_regime: false,
    onagre_demande_identifier: null,
    communes: null,
    departments: ["01"],
    regions: null,
    deposant_last_name: "Durand",
    deposant_first_names: "Alice",
    demandeur_personne_physique_last_name: "Durand",
    demandeur_personne_physique_first_names: "Alice",
    demandeur_personne_morale_legal_name: null,
    demandeur_personne_morale_siret: null,
    phase: "Accompagnement amont",
    next_action_expected_from: null,
    depot_date: "2026-01-15",
    phase_start_date: "2026-01-15",
    enjeu: false,
    latestCommentaire: null,
    ...overrides,
  } as unknown as DossierSummary;
}
