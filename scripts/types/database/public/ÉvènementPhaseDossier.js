/** @typedef {import('./Dossier').DossierId} DossierId */
/** @typedef {import('./Personne').PersonneId} PersonneId */
export {};
/**
 * Represents the table public.évènement_phase_dossier
 * @typedef {Object} VNementPhaseDossier
 * @property {DossierId} dossier
 * @property {string} phase
 * @property {Date} horodatage
 * @property {PersonneId | null} cause_personne
 */
/**
 * Represents the initializer for the table public.évènement_phase_dossier
 * @typedef {Object} VNementPhaseDossierInitializer
 * @property {DossierId} dossier
 * @property {string} phase
 * @property {Date} horodatage
 * @property {PersonneId | null} [cause_personne]
 */
/**
 * Represents the mutator for the table public.évènement_phase_dossier
 * @typedef {Object} VNementPhaseDossierMutator
 * @property {DossierId} [dossier]
 * @property {string} [phase]
 * @property {Date} [horodatage]
 * @property {PersonneId | null} [cause_personne]
 */
