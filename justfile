set dotenv-load

# Lance le CLI knex via tsx pour supporter le knexfile et les migrations/seeds en TypeScript
knex := "node --import tsx ./node_modules/knex/bin/cli.js"

# Liste les recettes disponibles
default:
    @just --list

# Déploie sur l'environnement de staging après toutes les vérifications CI
deploy-staging:
    just ci
    git push staging staging:main

# Lance toutes les vérifications de la CI (check + build + tests). À utiliser avant un push.
ci:
    just check
    just build
    just test

# Lance les vérifications statiques rapides (format, types, svelte-check)
check:
    just check-format
    # just check-lint
    just check-types
    just check-svelte

# Vérifie le formatage sans modifier les fichiers
check-format:
    prettier --check .

# Vérifie les types TypeScript / JSDoc (équivalent du job CI tsc)
check-types:
    tsc

# Vérifie les composants Svelte (équivalent du job CI svelte-check)
check-svelte:
    svelte-check --fail-on-warnings

# Construit l'application (équivalent du job CI build)
build:
    vite build

# Lance Pitchou en mode dev (vite dev server SvelteKit, http://localhost:5173)
dev:
    vite dev

# Lance les conteneurs Docker de support (Postgres + pgadmin)
dev-docker:
    docker compose up

# Arrête les conteneurs Docker
dev-stop:
    docker compose down

# Suit les logs Docker en temps réel
dev-logs:
    docker compose logs -f

# Redémarre les conteneurs Docker (utile après un changement de config)
dev-restart:
    docker compose restart

# Applique les migrations en attente
migrate-up:
    {{ knex }} migrate:up --env docker_dev

# Annule la dernière migration appliquée
migrate-down:
    {{ knex }} migrate:down --env docker_dev

# Applique toutes les migrations en attente
migrate-latest:
    {{ knex }} migrate:latest --env docker_dev

# Insère les données de dev en base
seed-dev:
    {{ knex }} seed:run --env docker_dev

# Synchronise les dossiers depuis Démarches Simplifiées (sans argument : dernières heures ; sinon depuis la date passée, ex: just sync-ds 2025-06-01)
sync-ds lastModified="":
    node outils/sync-démarche-numérique.js --IdSchemaDS derogation-especes-protegees {{ if lastModified == "" { "" } else { "--lastModified " + lastModified } }}

# Génère tous les types (base de données + Démarche Numérique)
build-types:
    just build-types-db
    just build-types-ds

# Génère les types depuis le schéma de la base de données
build-types-db:
    kanel -d "$DATABASE_URL" -o ./scripts/types/database

# Génère les types des schémas Démarche Numérique
build-types-ds:
    just build-types-ds-88444
    just build-types-ds-128114

# Génère les types du schéma DDEP (88444)
build-types-ds-88444:
    node outils/genere-types-schema-DS.js --idSchemaDS derogation-especes-protegees

# Génère les types du schéma 128114
build-types-ds-128114:
    node outils/genere-types-schema-DS.js --idSchemaDS 7f52a348-fd16-4fcd-8a6f-2e78ddafaee4

# Reformate le code avec prettier
format:
    prettier --write . --log-level warn

# Lance tous les tests (unitaires + composants + intégration + e2e)
test:
    just test-unit
    just test-component
    just test-integration
    just test-e2e

# Démarre le conteneur Postgres pour les tests d'intégration et e2e
test-db-up:
    docker compose -f tests/compose.yml up -d

# Arrête le conteneur Postgres de test
test-db-down:
    docker compose -f tests/compose.yml down

# Lance les tests unitaires avec vitest
test-unit:
    vitest run --config tests/vitest.config.ts --project=unit

# Lance les tests unitaires en mode watch
test-unit-watch:
    vitest --config tests/vitest.config.ts --project=unit

# Lance les tests de composants Svelte (vitest browser mode)
test-component:
    vitest run --config tests/vitest.config.ts --project=component

# Lance les tests d'intégration (endpoints + base réelle)
test-integration:
    vitest run --config tests/vitest.config.ts --project=integration

# Lance les tests end-to-end avec playwright
test-e2e:
    playwright test --config tests/playwright.config.ts
