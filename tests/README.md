# Tests

Générer les fichiers de schémas de base de données:

```sh
docker compose exec db pg_dump --clean --if-exists --exclude-table="knex*" --schema-only -h localhost -U dev especes_pro_3731 > tests/fixtures/01-schema.sql
docker compose exec db pg_dump --clean --if-exists --table="knex*" -h localhost -U dev especes_pro_3731 > tests/fixtures/02-knex.sql
```

Lancer l'environnement de tests:

```sh
docker compose -f compose-tests.yml up
```
