/** @typedef {import('./Personne').PersonneId} PersonneId */
/** @typedef {import('./Entreprise').EntrepriseSiret} EntrepriseSiret */

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
 * @property {string | null} enjeu_écologiques
 * @property {unknown | null} départements
 * @property {unknown | null} communes
 * @property {PersonneId | null} déposant
 * @property {PersonneId | null} demandeur_personne_physique
 * @property {EntrepriseSiret | null} demandeur_personne_morale
 */
/**
 * Represents the initializer for the table public.dossier
 * @typedef {Object} DossierInitializer
 * @property {DossierId} [id] Default value: nextval('dossier_id_seq'::regclass)
 * @property {string | null} [id_demarches_simplifiées]
 * @property {string | null} [statut]
 * @property {Date | null} [date_dépôt]
 * @property {string | null} [espèces_protégées_concernées]
 * @property {string | null} [enjeu_écologiques]
 * @property {unknown | null} [départements]
 * @property {unknown | null} [communes]
 * @property {PersonneId | null} [déposant]
 * @property {PersonneId | null} [demandeur_personne_physique]
 * @property {EntrepriseSiret | null} [demandeur_personne_morale]
 */
/**
 * Represents the mutator for the table public.dossier
 * @typedef {Object} DossierMutator
 * @property {DossierId} [id]
 * @property {string | null} [id_demarches_simplifiées]
 * @property {string | null} [statut]
 * @property {Date | null} [date_dépôt]
 * @property {string | null} [espèces_protégées_concernées]
 * @property {string | null} [enjeu_écologiques]
 * @property {unknown | null} [départements]
 * @property {unknown | null} [communes]
 * @property {PersonneId | null} [déposant]
 * @property {PersonneId | null} [demandeur_personne_physique]
 * @property {EntrepriseSiret | null} [demandeur_personne_morale]
 */
