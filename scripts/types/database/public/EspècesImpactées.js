/** @typedef {import('./Dossier').DossierId} DossierId */
export {};
/**
 * Identifier type for public.espèces_impactées
 * @typedef {string & { __brand: 'EspCesImpactEsId' }} EspCesImpactEsId
 */
/**
 * Represents the table public.espèces_impactées
 * @typedef {Object} EspCesImpactEs
 * @property {EspCesImpactEsId} id
 * @property {DossierId} dossier
 * @property {string | null} nom
 * @property {string | null} media_type
 * @property {unknown | null} contenu
 */
/**
 * Represents the initializer for the table public.espèces_impactées
 * @typedef {Object} EspCesImpactEsInitializer
 * @property {EspCesImpactEsId} [id] Default value: gen_random_uuid()
 * @property {DossierId} dossier
 * @property {string | null} [nom]
 * @property {string | null} [media_type]
 * @property {unknown | null} [contenu]
 */
/**
 * Represents the mutator for the table public.espèces_impactées
 * @typedef {Object} EspCesImpactEsMutator
 * @property {EspCesImpactEsId} [id]
 * @property {DossierId} [dossier]
 * @property {string | null} [nom]
 * @property {string | null} [media_type]
 * @property {unknown | null} [contenu]
 */
