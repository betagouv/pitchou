default:
    @just --list

deploy-staging:
    just ci
    git push staging staging:main

ci:
    just format-check
    just lint
    just test

migrate-up:
    pnpm run migrate:up

migrate-down:
    pnpm run migrate:down

seed-dev:
    pnpm run seed:dev

build-types:
    pnpm run build-types

build-types-db:
    pnpm run build-types:db

build-types-ds:
    pnpm run build-types:ds

build-types-ds-88444:
    pnpm run build-types:ds:88444

build-types-ds-128114:
    pnpm run build-types:ds:128114

format:
    pnpm run format

format-check:
    pnpm run format:check

test:
    just test-unit
    just test-e2e

test-e2e:
    playwright test tests/e2e

test-unit:
    vitest

test-unit-watch:
    pnpm run test:unit:watch
