# Tests

Quatre niveaux, distingués par l'emplacement et l'extension du fichier :

| Niveau      | Runner                | Fichiers                         | Navigateur     | Base   | Couverture                 |
| ----------- | --------------------- | -------------------------------- | -------------- | ------ | -------------------------- |
| Unit        | Vitest (node)         | `scripts/**/*.test.ts`           | non            | non    | Logique pure               |
| Composant   | Vitest (browser mode) | `scripts/**/*.svelte.test.ts`    | oui (Chromium) | non    | Un composant Svelte        |
| Intégration | Vitest (node)         | `tests/integration/**/*.test.ts` | non            | réelle | Un endpoint Kit + Postgres |
| E2E         | Playwright            | `tests/e2e/**/*.spec.ts`         | oui (Firefox)  | réelle | Parcours utilisateur       |

## Lancer les tests

Postgres pour intégration et e2e :

```sh
just test-db-up
```

Puis :

```sh
just test-unit         # unitaires uniquement
just test-component    # composants Svelte
just test-integration  # intégration (nécessite Postgres + build)
just test-e2e          # e2e (nécessite Postgres + build)
just test              # les quatre
```

`just test-integration` et `just test-e2e` lancent chacun leur propre serveur
Kit sur la machine hôte (ports 32649 et 32648), avec des bases distinctes
(`pitchou_test`, `pitchou_test_e2e`).

## Ajouter un test

Copier le modèle correspondant :

- Unit : `scripts/commun/manipulationStrings.test.ts`
- Composant : `scripts/front-end/components/TagPhase.svelte.test.ts`
- Intégration : `tests/integration/caps.test.ts`
- E2E : `tests/e2e/login-and-see-dossier.spec.ts`

Les données de test se créent via les factories programmatiques de
`tests/factories/` — pas de SQL.
