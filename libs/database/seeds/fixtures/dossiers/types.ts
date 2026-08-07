import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PrescriptionInitializer } from "@pitchou/types/database/public/Prescription.ts";
import type { ControleInitializer } from "@pitchou/types/database/public/Controle.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

export type SeedDossier = Omit<
  DossierInitializer,
  | "id"
  | "demarche_numerique_id"
  | "deposant"
  | "demandeur_personne_physique"
  | "demandeur_personne_morale"
  | "representative"
  | "especes_impactees"
> & {
  groupe_instructeur: string;
  /** SIRET de l'entreprise demandeuse (personne morale). L'entreprise doit figurer dans SEED_ENTREPRISES. */
  demandeur_personne_morale?: string;
  /** Email of the personne physique demandeur. The personne must be listed in SEED_PERSONNES. */
  demandeur_personne_physique_email?: string;
  /** Email of the representant (personne morale), stored as an identite_dossier snapshot. The personne must be listed in SEED_PERSONNES. */
  representative_email?: string;
  /** Email of the demandeur identity (DN identity block), stored as an identite_dossier snapshot and linked as dossier.deposant. The personne must be listed in SEED_PERSONNES. */
  deposant_email?: string;
  /** Email of the mandataire (when the dossier was deposited par un tiers), stored as an identite_dossier snapshot. The personne must be listed in SEED_PERSONNES. */
  mandataire_email?: string;
};

export type SeedAvisExpert = Omit<
  AvisExpertInitializer,
  "id" | "dossier" | "saisine_fichier" | "avis_fichier"
> & {
  id: string;
  dossier: string;
  /** When set, a placeholder PDF is generated and linked as the saisine file. */
  nom_fichier_saisine?: string;
  /** When set, a placeholder PDF is generated and linked as the avis file. */
  nom_fichier_avis?: string;
};

export type SeedEvenementPhaseDossier = Omit<
  EvenementPhaseDossierInitializer,
  "dossier" | "caused_by_personne"
> & {
  dossier: string;
};

export type SeedDecisionAdministrative = Omit<
  DecisionAdministrativeInitializer,
  "id" | "dossier" | "fichier"
> & {
  id: string;
  dossier: string;
  /** When set, a placeholder PDF is generated and linked as the décision's fichier. */
  nom_fichier?: string;
};

export type SeedPrescription = Omit<PrescriptionInitializer, "id" | "decision_administrative"> & {
  id: string;
  decision_administrative: string;
};

export type SeedControle = Omit<ControleInitializer, "id" | "prescription"> & {
  id: string;
  prescription: string;
};

export type SeedEntreprise = {
  siret: string;
  legal_name: string;
  address: string | null;
  siren?: string | null;
  legal_form?: string | null;
  naf_code?: string | null;
  naf_label?: string | null;
  /** ISO date string ("YYYY-MM-DD"). */
  creation_date?: string | null;
  /** Raw Démarche Numérique value: "Actif" or "Ferme". */
  admin_status?: string | null;
  /** Headcount range label, e.g. "50 à 99 salariés". */
  headcount?: string | null;
  /** Share capital in euros, as a string. */
  share_capital?: string | null;
  insee_code?: string | null;
  postal_code?: string | null;
  department?: string | null;
  region?: string | null;
};

export type SeedPersonne = {
  last_name: string;
  first_names: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type SeedLigneEspeceImpactee = {
  classification: "oiseau" | "faune non-oiseau" | "flore";
  /** CD_REF of the espèce; must be resolvable in the espece_protegee view */
  cd_ref: string;
  /** "Identifiant Pitchou" of the threatening activité (e.g. "P-4-1", "P-4-2", "P-60") */
  identifiant_pitchou_activité: string;
  nombre_individus?: string;
  nombre_nids?: number;
  nombre_oeufs?: number;
  surface_habitat_détruit?: number;
};

export type SeedEspecesImpactees = {
  /** demarche_numerique_number of the dossier */
  dossier: string;
  nom_fichier: string;
  lignes: SeedLigneEspeceImpactee[];
};
