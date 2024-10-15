/** @typedef {import('./Dossier').DossierId} DossierId */
export {};
/**
 * Identifier type for public.message
 * @typedef {string & { __brand: 'MessageId' }} MessageId
 */
/**
 * Represents the table public.message
 * @typedef {Object} Message
 * @property {MessageId} id
 * @property {string | null} contenu
 * @property {Date | null} date
 * @property {string | null} email_expéditeur
 * @property {string | null} id_démarches_simplifiées
 * @property {DossierId | null} dossier
 */
/**
 * Represents the initializer for the table public.message
 * @typedef {Object} MessageInitializer
 * @property {MessageId} [id] Default value: gen_random_uuid()
 * @property {string | null} [contenu]
 * @property {Date | null} [date]
 * @property {string | null} [email_expéditeur]
 * @property {string | null} [id_démarches_simplifiées]
 * @property {DossierId | null} [dossier]
 */
/**
 * Represents the mutator for the table public.message
 * @typedef {Object} MessageMutator
 * @property {MessageId} [id]
 * @property {string | null} [contenu]
 * @property {Date | null} [date]
 * @property {string | null} [email_expéditeur]
 * @property {string | null} [id_démarches_simplifiées]
 * @property {DossierId | null} [dossier]
 */
