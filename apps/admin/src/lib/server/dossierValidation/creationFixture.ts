import {
  dossierRequestContextOptions,
  motifDerogationOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import type { ActiviteContext } from "./activiteContext.ts";

/** The activities the validation tests use, mirroring the referentiel seed. */
export const activiteContextFixture: ActiviteContext = {
  acceptedLabels: new Set([
    "Carrières",
    "Demande à caractère scientifique",
    "Desaîrage",
    "Infrastructures de transport ferroviaire",
    "Production énergie renouvelable - Éolien -  Suivi mortalité",
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  ]),
  codeByLabel: new Map([
    ["Carrières", "carrieres"],
    ["Demande à caractère scientifique", "demande-scientifique"],
    ["Desaîrage", "desairage"],
    ["Infrastructures de transport ferroviaire", "transport-ferroviaire"],
    [
      "Production énergie renouvelable - Éolien -  Suivi mortalité",
      "energie-eolien-suivi-mortalite",
    ],
    [
      "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
      "restauration-batiments",
    ],
  ]),
};

export const relations = {
  groupe_instructeurs: "groupe-1",
  demandeur_type: "personne_physique",
  demandeur_personne_physique: {
    last_name: "Martin",
    first_names: "Camille",
    email: null,
    address: null,
    phone: null,
    role: null,
  },
  demandeur_personne_morale: null,
  identites: [
    {
      type: "demandeur",
      last_name: "Martin",
      first_names: "Camille",
      email: null,
      phone: null,
      role: null,
    },
  ],
};

export const validCreation = {
  name: "Projet test",
  depot_date: "2026-08-01",
  phase: "Accompagnement amont",
  relations,
  columns: {
    urgent_contact_phone: "0612345678",
    description: "Description synthétique",
    linked_to_ae_regime: "unknown",
    ae_procedures: null,
    ae_other_procedure: null,
    especes_prise_detention_limitee_type: null,
    scientifique_demande_purposes: null,
    scientifique_previous_assessment: null,
    scientifique_mortality_measures_taken: null,
    scientifique_mortality_measures_details: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    intervention_start_date: "2026-08-01",
    intervention_end_date: "2026-08-31",
    commissioning_date: null,
    intervention_duration: null,
    main_activite: "Carrières",
    type: null,
    request_context: dossierRequestContextOptions[2],
    accompaniment_need: null,
    location_scope: "france",
    primary_department: "01",
    communes: [],
    departments: [],
    regions: [],
    no_other_satisfactory_solution_justification: "Aucune autre solution satisfaisante",
    motif_derogation: motifDerogationOptions[0],
    motif_derogation_justification: "Le projet répond à une RIIPM",
    scientifique_demande_type: null,
  },
};
