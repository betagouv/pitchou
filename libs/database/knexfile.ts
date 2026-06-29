import type { Knex } from "knex";

const config: Record<string, Knex.Config> = {
  docker_dev: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 5,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds/dev",
    },
  },

  production: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 30,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
  },

  // Same as prod, but with seeds
  staging: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 0,
      max: 30,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds/dev",
    },
  },
};

export default config;
