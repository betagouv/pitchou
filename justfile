# Liste les recettes disponibles
default:
    @just --list

# Déploie sur l'environnement de staging après les vérifications CI
deploy-staging:
    just ci
    git push staging staging:main

# Lance les vérifications de qualité de code (format, lint, tests)
ci:
    just format-check
    # just lint
    just test

# Applique les migrations en attente
migrate-up:
    pnpm run migrate:up

# Annule la dernière migration appliquée
migrate-down:
    pnpm run migrate:down

# Insère les données de dev en base
seed-dev:
    pnpm run seed:dev

# Génère tous les types (base de données + Démarche Numérique)
build-types:
    pnpm run build-types

# Génère les types depuis le schéma de la base de données
build-types-db:
    pnpm run build-types:db

# Génère les types des schémas Démarche Numérique
build-types-ds:
    pnpm run build-types:ds

# Génère les types du schéma DDEP (88444)
build-types-ds-88444:
    pnpm run build-types:ds:88444

# Génère les types du schéma 128114
build-types-ds-128114:
    pnpm run build-types:ds:128114

# Reformate le code avec prettier
format:
    pnpm run format

# Vérifie le formatage sans modifier les fichiers
format-check:
    pnpm run format:check

# Lance tous les tests (unitaires + e2e)
test:
    just test-unit
    just test-e2e

# Lance les tests end-to-end avec playwright
test-e2e:
    playwright test tests/e2e

# Lance les tests unitaires avec vitest
test-unit:
    vitest

# Lance les tests unitaires en mode watch
test-unit-watch:
    pnpm run test:unit:watch
