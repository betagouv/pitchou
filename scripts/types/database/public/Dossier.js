/** @typedef {import('./Personne').PersonneId} PersonneId */
/** @typedef {import('./Entreprise').EntrepriseSiret} EntrepriseSiret */
export {};
/**
 * Identifier type for public.dossier
 * @typedef {number & { __brand: 'DossierId' }} DossierId
 */
/**
 * Represents the table public.dossier
 * @typedef {Object} Dossier
 * @property {DossierId} id
 * @property {string | null} id_demarches_simplifiées
 * @property {string | null} statut
 * @property {Date | null} date_dépôt
 * @property {string | null} espèces_protégées_concernées
 * @property {unknown | null} départements
 * @property {unknown | null} communes
 * @property {PersonneId | null} déposant
 * @property {PersonneId | null} demandeur_personne_physique
 * @property {EntrepriseSiret | null} demandeur_personne_morale
 * @property {unknown | null} régions
 * @property {string | null} nom
 * @property {string | null} number_demarches_simplifiées
 * @property {string | null} historique_nom_porteur
 * @property {string | null} historique_localisation
 * @property {string | null} ddep_nécessaire
 * @property {string | null} en_attente_de
 * @property {boolean | null} enjeu_politique
 * @property {string | null} commentaire_enjeu
 * @property {Date | null} historique_date_réception_ddep
 * @property {Date | null} historique_date_envoi_dernière_contribution
 * @property {string | null} historique_identifiant_demande_onagre
 * @property {Date | null} historique_date_saisine_csrpn
 * @property {Date | null} historique_date_saisine_cnpn
 * @property {Date | null} date_avis_csrpn
 * @property {Date | null} date_avis_cnpn
 * @property {string | null} avis_csrpn_cnpn
 * @property {Date | null} date_consultation_public
 * @property {string | null} historique_décision
 * @property {Date | null} historique_date_signature_arrêté_préfectoral
 * @property {string | null} historique_référence_arrêté_préfectoral
 * @property {Date | null} historique_date_signature_arrêté_ministériel
 * @property {string | null} historique_référence_arrêté_ministériel
 * @property {boolean | null} enjeu_écologique
 * @property {string | null} commentaire_libre
 * @property {boolean | null} rattaché_au_régime_ae
 * @property {string | null} prochaine_action_attendue_par
 * @property {string | null} prochaine_action_attendue
 * @property {string | null} activité_principale
 */
/**
 * Represents the initializer for the table public.dossier
 * @typedef {Object} DossierInitializer
 * @property {DossierId} [id] Default value: nextval('dossier_id_seq'::regclass)
 * @property {string | null} [id_demarches_simplifiées]
 * @property {string | null} [statut]
 * @property {Date | null} [date_dépôt]
 * @property {string | null} [espèces_protégées_concernées]
 * @property {unknown | null} [départements]
 * @property {unknown | null} [communes]
 * @property {PersonneId | null} [déposant]
 * @property {PersonneId | null} [demandeur_personne_physique]
 * @property {EntrepriseSiret | null} [demandeur_personne_morale]
 * @property {unknown | null} [régions]
 * @property {string | null} [nom]
 * @property {string | null} [number_demarches_simplifiées]
 * @property {string | null} [historique_nom_porteur]
 * @property {string | null} [historique_localisation]
 * @property {string | null} [ddep_nécessaire]
 * @property {string | null} [en_attente_de]
 * @property {boolean | null} [enjeu_politique]
 * @property {string | null} [commentaire_enjeu]
 * @property {Date | null} [historique_date_réception_ddep]
 * @property {Date | null} [historique_date_envoi_dernière_contribution]
 * @property {string | null} [historique_identifiant_demande_onagre]
 * @property {Date | null} [historique_date_saisine_csrpn]
 * @property {Date | null} [historique_date_saisine_cnpn]
 * @property {Date | null} [date_avis_csrpn]
 * @property {Date | null} [date_avis_cnpn]
 * @property {string | null} [avis_csrpn_cnpn]
 * @property {Date | null} [date_consultation_public]
 * @property {string | null} [historique_décision]
 * @property {Date | null} [historique_date_signature_arrêté_préfectoral]
 * @property {string | null} [historique_référence_arrêté_préfectoral]
 * @property {Date | null} [historique_date_signature_arrêté_ministériel]
 * @property {string | null} [historique_référence_arrêté_ministériel]
 * @property {boolean | null} [enjeu_écologique]
 * @property {string | null} [commentaire_libre]
 * @property {boolean | null} [rattaché_au_régime_ae]
 * @property {string | null} [prochaine_action_attendue_par]
 * @property {string | null} [prochaine_action_attendue]
 * @property {string | null} [activité_principale]
 */
/**
 * Represents the mutator for the table public.dossier
 * @typedef {Object} DossierMutator
 * @property {DossierId} [id]
 * @property {string | null} [id_demarches_simplifiées]
 * @property {string | null} [statut]
 * @property {Date | null} [date_dépôt]
 * @property {string | null} [espèces_protégées_concernées]
 * @property {unknown | null} [départements]
 * @property {unknown | null} [communes]
 * @property {PersonneId | null} [déposant]
 * @property {PersonneId | null} [demandeur_personne_physique]
 * @property {EntrepriseSiret | null} [demandeur_personne_morale]
 * @property {unknown | null} [régions]
 * @property {string | null} [nom]
 * @property {string | null} [number_demarches_simplifiées]
 * @property {string | null} [historique_nom_porteur]
 * @property {string | null} [historique_localisation]
 * @property {string | null} [ddep_nécessaire]
 * @property {string | null} [en_attente_de]
 * @property {boolean | null} [enjeu_politique]
 * @property {string | null} [commentaire_enjeu]
 * @property {Date | null} [historique_date_réception_ddep]
 * @property {Date | null} [historique_date_envoi_dernière_contribution]
 * @property {string | null} [historique_identifiant_demande_onagre]
 * @property {Date | null} [historique_date_saisine_csrpn]
 * @property {Date | null} [historique_date_saisine_cnpn]
 * @property {Date | null} [date_avis_csrpn]
 * @property {Date | null} [date_avis_cnpn]
 * @property {string | null} [avis_csrpn_cnpn]
 * @property {Date | null} [date_consultation_public]
 * @property {string | null} [historique_décision]
 * @property {Date | null} [historique_date_signature_arrêté_préfectoral]
 * @property {string | null} [historique_référence_arrêté_préfectoral]
 * @property {Date | null} [historique_date_signature_arrêté_ministériel]
 * @property {string | null} [historique_référence_arrêté_ministériel]
 * @property {boolean | null} [enjeu_écologique]
 * @property {string | null} [commentaire_libre]
 * @property {boolean | null} [rattaché_au_régime_ae]
 * @property {string | null} [prochaine_action_attendue_par]
 * @property {string | null} [prochaine_action_attendue]
 * @property {string | null} [activité_principale]
 */
