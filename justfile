set dotenv-load

# Run a TypeScript file via tsx (from the repo root)
tsx := "node --import tsx"

# Run the knex CLI inside the database package (TS knexfile + migrations/seeds, cwd = libs/database)
knex := "corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js"

# Run a binary inside the instructeur app (cwd = apps/instructeur)
instructeur := "corepack pnpm --filter @pitchou/app-instructeur exec"

# Run a TypeScript file via tsx inside the worker package (cwd = libs/worker)
worker := "corepack pnpm --filter @pitchou/worker exec tsx"

# List available recipes
default:
    @just --list

# List all buckets of the account (checks creds + endpoint)
aws-buckets:
    aws s3api list-buckets

# List the current bucket files recursively ($S3_BUCKET)
aws-ls:
    aws s3 ls "s3://$S3_BUCKET" --recursive

# Remove an object from the bucket (e.g. just aws-rm test-uploads/abc-123)
aws-rm KEY:
    aws s3 rm "s3://$S3_BUCKET/{{KEY}}"

# Show total size and file count of the bucket
aws-usage:
    @aws s3 ls "s3://$S3_BUCKET" --recursive --summarize | tail -n 2 | awk '/Total Objects/ {print "Fichiers : " $3} /Total Size/ {cmd="numfmt --to=si --format=%.1f --suffix=B " $3; cmd | getline s; close(cmd); print "Taille   : " s}'

# Build the instructeur app (CI build job)
build:
    {{ instructeur }} vite build

# Run the fast static checks (format, types, svelte-check)
check:
    just sync
    just check-format
    # just check-lint
    just check-types
    just check-svelte

# Check formatting without modifying files
check-format:
    prettier --check .

# Check Svelte components (CI svelte-check job), per app
check-svelte:
    just sync
    {{ instructeur }} svelte-check --fail-on-warnings

# Check TypeScript / JSDoc types across every workspace package
check-types:
    just sync
    corepack pnpm -r exec tsc

# Run all CI checks (check + build + tests). Use before pushing.
ci:
    just check
    just build
    just test

# Wipe the whole DB (drop + recreate the public schema, also clears migration history)
db-clear:
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Roll back the last applied migration
db-migrate-down:
    {{ knex }} migrate:down --env docker_dev

# Apply all pending migrations
db-migrate-latest:
    {{ knex }} migrate:latest --env docker_dev

# Apply pending migrations
db-migrate-up:
    {{ knex }} migrate:up --env docker_dev

# Reset the DB from scratch: wipe everything, replay migrations, then insert seeds
db-reset:
    just db-clear
    just db-migrate-latest
    just db-seed

# Insert dev data into the DB
db-seed:
    {{ knex }} seed:run --env docker_dev

# Show table sizes
db-size:
    psql "$DATABASE_URL" -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Deploy to staging after all CI checks
deploy-staging:
    just ci
    git push staging staging:main

# Run the instructeur app in dev mode (vite dev server, http://localhost:5173)
dev:
    {{ instructeur }} vite dev

# Run the admin app in dev mode (http://localhost:5174)
dev-admin:
    corepack pnpm --filter @pitchou/app-admin exec vite dev

# Run every app in dev mode in parallel (instructeur :5173 + admin :5174)
dev-all:
    corepack pnpm --parallel --filter "./apps/*" exec vite dev

# Stop the Docker containers
docker-down:
    docker compose down

# Follow Docker logs in real time
docker-logs:
    docker compose logs -f

# Restart the Docker containers (useful after a config change)
docker-restart:
    docker compose restart

# Stop the test containers
docker-test-down:
    docker compose -f apps/instructeur/tests/compose.yml down

# Start the test containers (Postgres + rustfs S3) for integration and e2e tests
docker-test-up:
    docker compose -f apps/instructeur/tests/compose.yml up -d

# Run the support Docker containers (Postgres + pgadmin + rustfs S3)
docker-up:
    docker compose up

# Reformat the code with prettier
format:
    prettier --write . --log-level warn

# Generate SvelteKit types for every app
sync:
    corepack pnpm --filter "./apps/*" exec svelte-kit sync

# Generate all types (database + Démarche Numérique)
generate-types:
    just generate-types-db
    just generate-types-ds

# Generate types from the database schema
generate-types-db:
    kanel -d "$DATABASE_URL" -o ./libs/types/src/database

# Generate Démarche Numérique schema types (downloads the latest schema version)
generate-types-ds:
    {{ tsx }} scripts/genere-types-schema-DS.ts --idSchemaDS derogation-especes-protegees

# Generate DS types from the schema file already in the repo (no download)
generate-types-ds-local:
    {{ tsx }} scripts/genere-types-schema-DS.ts --skipDownload --idSchemaDS derogation-especes-protegees

# Génère la table espece_taxref depuis TAXREF (data/sources_especes/TAXREFv18.txt). À lancer en dev comme en prod après mise à jour de la source.
generate-taxref:
    {{ worker }} importer-taxref.ts

# Génère la table espece_bdc_statut depuis BDC-Statuts (data/sources_especes/bdc_18_01.csv, tous statuts). À lancer en dev comme en prod après mise à jour de la source.
generate-bdc:
    {{ worker }} importer-bdc.ts

# Régénère la table espece_protegee_reference depuis espece_taxref + espece_bdc_statut (à lancer après les sources). La couche manuelle (espece_protegee_modification) n'est pas touchée.
generate-especes-protegees:
    {{ worker }} rafraichir-reference-especes.ts

# Génère les deux tables sources (TAXREF + BDC) puis la référence (raccourci dev/prod).
generate-especes-sources:
    just generate-taxref
    just generate-bdc
    just generate-especes-protegees

# [ONE-OFF prod] Génère espece_protegee_modification depuis les .ods (drapeaux ministérielle/CNPN + ajouts « Protection Pitchou »), en matchant la référence déjà construite. À lancer une fois au déploiement ; ce script et les .ods seront ensuite supprimés.
generate-modifications-especes:
    {{ worker }} importer-modifications-especes.ts

# Sync dossiers from Démarches Simplifiées (no arg: last hours; else since the given date, e.g. just sync-ds 2025-06-01)
sync-ds lastModified="":
    {{ worker }} sync-démarche-numérique.ts --IdSchemaDS derogation-especes-protegees {{ if lastModified == "" { "" } else { "--lastModified " + lastModified } }}

# Run all tests (unit + component + integration + e2e)
test:
    just test-unit
    just test-component
    just test-integration
    just test-e2e

# Run Svelte component tests (vitest browser mode)
test-component:
    {{ instructeur }} vitest run --config tests/vitest.config.ts --project=component

# Run end-to-end tests with playwright
test-e2e:
    just build
    {{ instructeur }} playwright test --config tests/playwright.config.ts

# Run integration tests (endpoints + real DB)
test-integration:
    just build
    {{ instructeur }} vitest run --config tests/vitest.config.ts --project=integration

# Run unit tests with vitest
test-unit:
    {{ instructeur }} vitest run --config tests/vitest.config.ts --project=unit

# Run unit tests in watch mode
test-unit-watch:
    {{ instructeur }} vitest --config tests/vitest.config.ts --project=unit
