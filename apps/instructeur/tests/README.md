# Tests

Les [instructions CI](../../../documentation/ci.md) décrivent l'installation, les services
jetables et les commandes communes à GitHub et au poste local.

| Niveau        | Recette                         | Fichiers                                                                                                                  | Services                                              |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Unitaires     | `just test-unit`                | `libs/*/src/**/*.test.ts`, `libs/worker/**/*.test.ts`, `apps/*/src/**/*.test.ts`, `apps/instructeur/preview/**/*.test.ts` | Aucun                                                 |
| Composants    | `just test-component`           | `apps/*/src/**/*.svelte.test.ts`                                                                                          | Chromium                                              |
| Notifications | `just test-email-notifications` | `tests/notification-emails/**/*.test.ts`                                                                                  | PostgreSQL, envois simulés                            |
| Intégration   | `just test-integration`         | `tests/integration/**/*.test.ts`                                                                                          | PostgreSQL, RustFS, HTTP                              |
| E2E           | `just test-e2e`                 | `tests/e2e/**/*.spec.ts`                                                                                                  | PostgreSQL, RustFS, Firefox et Chromium pour la carte |

Les chemins `tests/` de cette table sont relatifs à `apps/instructeur`. Les configs Vitest
excluent les fichiers `*.svelte.test.ts` de la suite unitaire.

`just test` lance les cinq suites ; `just ci` ajoute les contrôles statiques et les builds.
Les recettes intégration et E2E compilent et démarrent les deux apps avec leurs origines
respectives. Ne pas réutiliser le build d'une suite pour l'autre.

Pour ajouter un test, partir d'un fichier existant du même niveau et utiliser les factories
de `tests/factories/`. Les suites qui utilisent la base tournent en série dans leur runner.
