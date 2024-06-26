// @generated
// This file is automatically generated by Kanel. Do not modify manually.
export {};
/**
 * Identifier type for public.knex_migrations_lock
 * @typedef {number & { __brand: 'KnexMigrationsLockIndex' }} KnexMigrationsLockIndex
 */
/**
 * Represents the table public.knex_migrations_lock
 * @typedef {Object} KnexMigrationsLock
 * @property {KnexMigrationsLockIndex} index
 * @property {number | null} is_locked
 */
/**
 * Represents the initializer for the table public.knex_migrations_lock
 * @typedef {Object} KnexMigrationsLockInitializer
 * @property {KnexMigrationsLockIndex} [index] Default value: nextval('knex_migrations_lock_index_seq'::regclass)
 * @property {number | null} [is_locked]
 */
/**
 * Represents the mutator for the table public.knex_migrations_lock
 * @typedef {Object} KnexMigrationsLockMutator
 * @property {KnexMigrationsLockIndex} [index]
 * @property {number | null} [is_locked]
 */
