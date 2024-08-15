// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {

  docker_dev: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 5
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 30
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
