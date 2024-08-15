// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type PersonneId } from './Personne';
import { type EntrepriseSiret } from './Entreprise';

/** Identifier type for public.dossier */
export type DossierId = number & { __brand: 'DossierId' };

/** Represents the table public.dossier */
export default interface Dossier {
  id: DossierId;

  id_demarches_simplifiées: string | null;

  statut: string | null;

  date_dépôt: Date | null;

  espèces_protégées_concernées: string | null;

  départements: unknown | null;

  communes: unknown | null;

  déposant: PersonneId | null;

  demandeur_personne_physique: PersonneId | null;

  demandeur_personne_morale: EntrepriseSiret | null;

  régions: unknown | null;

  nom: string | null;

  number_demarches_simplifiées: string | null;

  historique_nom_porteur: string | null;

  historique_localisation: string | null;

  ddep_nécessaire: string | null;

  en_attente_de: string | null;

  enjeu_politique: boolean | null;

  commentaire_enjeu: string | null;

  historique_date_réception_ddep: Date | null;

  historique_date_envoi_dernière_contribution: Date | null;

  historique_identifiant_demande_onagre: string | null;

  historique_date_saisine_csrpn: Date | null;

  historique_date_saisine_cnpn: Date | null;

  date_avis_csrpn: Date | null;

  date_avis_cnpn: Date | null;

  avis_csrpn_cnpn: string | null;

  date_consultation_public: Date | null;

  historique_décision: string | null;

  historique_date_signature_arrêté_préfectoral: Date | null;

  historique_référence_arrêté_préfectoral: string | null;

  historique_date_signature_arrêté_ministériel: Date | null;

  historique_référence_arrêté_ministériel: string | null;

  enjeu_écologique: boolean | null;

  commentaire_libre: string | null;

  rattaché_au_régime_ae: boolean | null;

  phase: string | null;

  prochaine_action_attendue_par: string | null;

  prochaine_action_attendue: string | null;
}

/** Represents the initializer for the table public.dossier */
export interface DossierInitializer {
  /** Default value: nextval('dossier_id_seq'::regclass) */
  id?: DossierId;

  id_demarches_simplifiées?: string | null;

  statut?: string | null;

  date_dépôt?: Date | null;

  espèces_protégées_concernées?: string | null;

  départements?: unknown | null;

  communes?: unknown | null;

  déposant?: PersonneId | null;

  demandeur_personne_physique?: PersonneId | null;

  demandeur_personne_morale?: EntrepriseSiret | null;

  régions?: unknown | null;

  nom?: string | null;

  number_demarches_simplifiées?: string | null;

  historique_nom_porteur?: string | null;

  historique_localisation?: string | null;

  ddep_nécessaire?: string | null;

  en_attente_de?: string | null;

  enjeu_politique?: boolean | null;

  commentaire_enjeu?: string | null;

  historique_date_réception_ddep?: Date | null;

  historique_date_envoi_dernière_contribution?: Date | null;

  historique_identifiant_demande_onagre?: string | null;

  historique_date_saisine_csrpn?: Date | null;

  historique_date_saisine_cnpn?: Date | null;

  date_avis_csrpn?: Date | null;

  date_avis_cnpn?: Date | null;

  avis_csrpn_cnpn?: string | null;

  date_consultation_public?: Date | null;

  historique_décision?: string | null;

  historique_date_signature_arrêté_préfectoral?: Date | null;

  historique_référence_arrêté_préfectoral?: string | null;

  historique_date_signature_arrêté_ministériel?: Date | null;

  historique_référence_arrêté_ministériel?: string | null;

  enjeu_écologique?: boolean | null;

  commentaire_libre?: string | null;

  rattaché_au_régime_ae?: boolean | null;

  phase?: string | null;

  prochaine_action_attendue_par?: string | null;

  prochaine_action_attendue?: string | null;
}

/** Represents the mutator for the table public.dossier */
export interface DossierMutator {
  id?: DossierId;

  id_demarches_simplifiées?: string | null;

  statut?: string | null;

  date_dépôt?: Date | null;

  espèces_protégées_concernées?: string | null;

  départements?: unknown | null;

  communes?: unknown | null;

  déposant?: PersonneId | null;

  demandeur_personne_physique?: PersonneId | null;

  demandeur_personne_morale?: EntrepriseSiret | null;

  régions?: unknown | null;

  nom?: string | null;

  number_demarches_simplifiées?: string | null;

  historique_nom_porteur?: string | null;

  historique_localisation?: string | null;

  ddep_nécessaire?: string | null;

  en_attente_de?: string | null;

  enjeu_politique?: boolean | null;

  commentaire_enjeu?: string | null;

  historique_date_réception_ddep?: Date | null;

  historique_date_envoi_dernière_contribution?: Date | null;

  historique_identifiant_demande_onagre?: string | null;

  historique_date_saisine_csrpn?: Date | null;

  historique_date_saisine_cnpn?: Date | null;

  date_avis_csrpn?: Date | null;

  date_avis_cnpn?: Date | null;

  avis_csrpn_cnpn?: string | null;

  date_consultation_public?: Date | null;

  historique_décision?: string | null;

  historique_date_signature_arrêté_préfectoral?: Date | null;

  historique_référence_arrêté_préfectoral?: string | null;

  historique_date_signature_arrêté_ministériel?: Date | null;

  historique_référence_arrêté_ministériel?: string | null;

  enjeu_écologique?: boolean | null;

  commentaire_libre?: string | null;

  rattaché_au_régime_ae?: boolean | null;

  phase?: string | null;

  prochaine_action_attendue_par?: string | null;

  prochaine_action_attendue?: string | null;
}
