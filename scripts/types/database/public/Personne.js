// @generated
// This file is automatically generated by Kanel. Do not modify manually.
export {};
/**
 * Identifier type for public.personne
 * @typedef {number & { __brand: 'PersonneId' }} PersonneId
 */
/**
 * Represents the table public.personne
 * @typedef {Object} Personne
 * @property {PersonneId} id
 * @property {string | null} nom
 * @property {string | null} prénoms
 * @property {string | null} email
 * @property {string | null} code_accès
 */
/**
 * Represents the initializer for the table public.personne
 * @typedef {Object} PersonneInitializer
 * @property {PersonneId} [id] Default value: nextval('personne_id_seq'::regclass)
 * @property {string | null} [nom]
 * @property {string | null} [prénoms]
 * @property {string | null} [email]
 * @property {string | null} [code_accès]
 */
/**
 * Represents the mutator for the table public.personne
 * @typedef {Object} PersonneMutator
 * @property {PersonneId} [id]
 * @property {string | null} [nom]
 * @property {string | null} [prénoms]
 * @property {string | null} [email]
 * @property {string | null} [code_accès]
 */
