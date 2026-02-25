import { Knex } from 'knex'

export type StorageBackend = 'sqlDatabase' | 'objectStorage'

export type StorageOptions = {
    storageBackend?: StorageBackend,
    databaseConnection?: Knex.Transaction | Knex
}
