# CI et déploiements

## Lancer les mêmes vérifications en local

Utiliser Node 24 et le pnpm déclaré dans `package.json`, actuellement 12.15.0.
Le catalogue et les politiques d'installation sont dans `pnpm-workspace.yaml`.
Le shell Nix verrouillé par `flake.lock` fournit Node et les outils système.

Dans un checkout sans `.env` de production et sans identifiants de services externes :

```sh
nix develop
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @pitchou/app-instructeur exec playwright install firefox chromium
just docker-test-up
just ci
just docker-test-down
```

Sur Ubuntu hors Nix, ajouter `--with-deps` à l'installation Playwright pour installer les
bibliothèques système. Nix fournit ces bibliothèques via `flake.nix`.
Arrêter les conteneurs avec `just docker-test-down` même si un test échoue.
`just docker-test-up` attend le healthcheck PostgreSQL avec une limite de 90 secondes.
Les serveurs HTTP appartiennent aux tests, il ne faut pas lancer `just dev`.

Les tests recréent leurs bases et vident leur bucket. Les services doivent être jetables.
PostgreSQL écoute par défaut sur `127.0.0.1:5433`, RustFS sur `127.0.0.1:9100`.
Les variables `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` et
`TEST_S3_ENDPOINT` permettent de changer ces adresses. Une surcharge Compose locale
n'ajuste pas ces variables automatiquement. Les configurations Vite chargent aussi le
`.env` racine, même avec `just --no-dotenv`. Un checkout séparé sans ce fichier évite
les envois Sentry et les accès accidentels à des services réels.

| Job GitHub                          | Recette locale                                   | Services                                            |
| ----------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Formatting, lint and file length    | `just check-format check-lint check-file-length` | Aucun                                               |
| TypeScript                          | `just check-types`                               | Aucun                                               |
| Svelte checks                       | `just check-svelte`                              | Aucun, vérifie les deux apps et refuse les warnings |
| Production builds                   | `just build`                                     | Aucun, construit les deux apps                      |
| Unit tests                          | `just sync test-unit`                            | Aucun                                               |
| Browser component tests             | `just sync test-component`                       | Chromium, deux apps                                 |
| Notification database tests         | `just sync test-email-notifications`             | PostgreSQL, envois simulés                          |
| HTTP and database integration tests | `just test-integration`                          | PostgreSQL, RustFS, deux serveurs                   |
| E2E Firefox and Chromium map        | `just test-e2e`                                  | PostgreSQL, RustFS, Firefox et Chromium             |

`just ci` exécute toutes ces vérifications. `just test` inclut les cinq suites.
Les tests de notification injectent des fonctions d'envoi simulées et testent les files,
les migrations, les relances et la persistance. Aucun secret Brevo n'est nécessaire.
La base dédiée s'appelle `pitchou_test_notifications`.

## Organisation des jobs

Le workflow `CI` tourne sur toutes les PR, les pushes vers `main` et `staging`, les
événements `merge_group` et les lancements manuels. Aucun filtre de chemins ne masque
un contrôle requis. `merge_group` permet de conserver ce contrôle si une file de fusion
est activée, sans présumer qu'elle existe aujourd'hui.

Les jobs indépendants tournent en parallèle. Les deux suites backend ont chacune leurs
services et leur checkout. `fail-fast: false` laisse terminer l'autre suite après un échec.
Ne pas lancer intégration et E2E simultanément dans un même checkout local : les deux
recettes remplacent les builds et utilisent le même bucket.

Les origines sont des paramètres de compilation dans `apps/*/vite.config.ts` via
`paths.origin`. Changer `PORT` au démarrage ne reconstruit pas les URL du bundle.

| Suite       | Origine admin            | Origine instructeur      |
| ----------- | ------------------------ | ------------------------ |
| Intégration | `http://127.0.0.1:32650` | `http://127.0.0.1:32649` |
| E2E         | `http://127.0.0.1:32647` | `http://127.0.0.1:32648` |

Chaque recette reconstruit donc les deux apps. Le job de build séparé vérifie aussi la
compilation sans origine de test imposée. Ce coût conserve l'équivalence avec `just ci`.
Aucun bundle ni `node_modules` ne circule entre jobs. Le cache contient le store pnpm ;
sa clé prend en compte le lockfile, les politiques workspace et le manifeste racine.
Une restauration du cache ne remplace jamais l'installation verrouillée.

PostgreSQL a un healthcheck. Le setup des tests attend une réponse S3, crée le bucket et
son CORS, puis attend les deux serveurs HTTP. Les requêtes de readiness ont une limite de
temps et le setup détecte une sortie prématurée des serveurs. Le teardown ferme les
serveurs et supprime la base, y compris après un échec de démarrage. GitHub détruit les
services à la fin du job, y compris en cas d'annulation. En local, arrêter aussi Compose.

Les limites sont de 10 à 30 minutes selon le job, et de 2 minutes pour le résultat final.
Une nouvelle révision de PR annule la précédente. Chaque commit poussé vers les branches
de déploiement garde son propre run, afin de ne pas annuler un contrôle attendu par Scalingo.

Les logs des recettes restent dans les étapes GitHub. En cas d'échec des types, reviewdog
relance le contrôle dans chaque workspace et produit des annotations GitHub avec les bons
chemins. Ce second passage ne décide pas du résultat. Le reporter `github-annotations`
remplace les commentaires de review pour fonctionner aussi sur les forks sans jeton en
écriture. Voir les [reporters reviewdog](https://github.com/reviewdog/reviewdog#reporter-github-annotations).
Les screenshots des composants des deux apps et les traces/screenshots E2E sont conservés
sept jours après un échec. La collecte E2E inclut les tentatives échouées même si une
relance réussit ensuite. Les annulations brutales peuvent empêcher leur collecte.

## Permissions et dépendances

Tous les jobs ont `contents: read`. Seuls les jobs TypeScript et Svelte ajoutent
`pull-requests: read`, car reviewdog lit le diff de la PR même sans filtrage des diagnostics.
Aucune permission d'écriture, aucun `pull_request_target`, secret de production ou
identifiant Scalingo n'est utilisé. Checkout ne conserve pas le jeton Git.
Les actions distantes sont fixées par SHA avec la version en commentaire ; Dependabot
propose leurs mises à jour chaque semaine. Vérifier le dépôt source, la version et les
permissions de chaque mise à jour, conformément aux [pratiques GitHub](https://docs.github.com/en/actions/reference/security/secure-use).
Les tags des images de test restent les versions de `compose.test.yml`. Node suit la
branche 24 du manifeste ; pnpm et les dépendances résolues sont verrouillés. Cela ne promet
pas une image Ubuntu identique bit à bit entre deux runs.

Le workflow séparé `Dependency audit` lance `pnpm audit --audit-level high` chaque semaine
et à la demande, dépendances de développement comprises. Il signale les vulnérabilités
connues, pas l'absence de code malveillant. Une erreur de registre fait aussi échouer le
job. Le mainteneur qui active le planning doit suivre ses notifications GitHub et traiter
les échecs. Ce job planifié n'est pas un contrôle requis sur les PR.

Les mises à jour npm automatiques et l'action dependency-review sont différées.
La [matrice Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)
consultée lors de cet audit liste pnpm jusqu'à v10, alors que ce dépôt utilise v12 et un
catalogue. Avant d'ajouter un contrôle basé sur le graphe GitHub, vérifier sur une PR réelle
qu'il détecte les changements du catalogue et toutes les dépendances du lockfile v12.
Un contrôle vert sur un graphe incomplet serait trompeur. Le scan pnpm fonctionne sur le
lockfile actuel, sans ajouter un service ni des permissions d'écriture.

Pour une mise à jour manuelle, modifier le catalogue, régénérer le lockfile avec le pnpm du
dépôt, lancer `pnpm audit` puis `just ci`. Conserver `minimumReleaseAge: 1440`,
`ignoreScripts: true` et `engineStrict: true` dans `pnpm-workspace.yaml`, comme le décrit
la [configuration pnpm](https://pnpm.io/settings). Conserver Sentry en version majeure 10
pour le serveur déployé et TypeScript dans la plage actuellement compatible avec le projet.
Cette modification CI ne change aucune version applicative. Un run GitHub dynamique
`Push on main` exécute déjà `Analyze (actions)` avec CodeQL. Aucun deuxième workflow
CodeQL n'est ajouté. Une extension à l'analyse applicative reste à examiner avec les
réglages de sécurité et un responsable du traitement des résultats.

## Contrôle requis à configurer par un propriétaire

Le seul nouveau contexte à exiger est `CI`, émis par GitHub Actions. Il utilise `always()`
et vérifie que tous ses jobs ont exactement le résultat `success`. Un échec, une annulation
ou un job ignoré ne peut donc pas être accepté par cet agrégat. Voir le comportement des
[contrôles requis GitHub](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

Après un premier run réussi sur la PR, sélectionner `CI` avec la source GitHub Actions dans
la protection de `main` et de `staging`. Garder les exigences de review existantes et exiger
une branche à jour si aucune file de fusion ne les remplace. Retirer uniquement les anciens
contextes CI suivants s'ils sont requis, au moment de la transition :

- `Format (oxfmt)` et `Lint (oxlint)`.
- `Type check (tsc + reviewdog)` et `Svelte check (svelte-check + reviewdog)`.
- `Build`, `Unit tests (vitest)` et `E2E tests (playwright)`.

Ne pas retirer des contrôles d'autres services. Ne pas exiger le workflow planifié
`Dependency audit`. Si l'ancien contrôle requis empêche la fusion de cette PR qui le
remplace, coordonner le changement de règle après vérification du nouveau run. Aucun
changement de protection n'est inclus dans cette branche.

## Déploiements Scalingo

Scalingo reste responsable des déploiements ; GitHub compile et teste. Le script `build`
racine choisit l'app avec `PITCHOU_APP`. `Procfile` lance `scripts/start.sh`. Le buildpack
installe pnpm et le démarrage ainsi que `cron.json` l'utilisent directement, sans Corepack.
L'ancienne recette `deploy-staging` a été retirée : elle testait le checkout courant puis
poussait la branche locale `staging` vers un remote Scalingo, qui pouvait contenir un autre
commit et contourner le circuit GitHub.

Observations en lecture seule du 24 octobre 2026, région `osc-secnum-fr1` :

| App Scalingo            | Dépôt              | Branche automatique | Review apps automatiques |
| ----------------------- | ------------------ | ------------------- | ------------------------ |
| `pitchou`               | `betagouv/pitchou` | `main`              | Non                      |
| `pitchou-admin-new`     | `betagouv/pitchou` | `main`              | Non                      |
| `pitchou-staging`       | `betagouv/pitchou` | `staging`           | Non                      |
| `pitchou-admin-staging` | `betagouv/pitchou` | `staging`           | Non                      |

Les variables lues confirment `PITCHOU_APP=instructeur` sur les deux apps instructeur et
`PITCHOU_APP=admin` sur les deux apps admin. Leurs `ORIGIN` respectives sont
`https://pitchou.beta.gouv.fr`, `https://admin.pitchou.beta.gouv.fr`,
`https://staging.pitchou.incubateur.net` et `https://staging.admin.pitchou.incubateur.net`.
Les deux apps staging ont `PUBLIC_PITCHOU_ENV=staging` ; cette variable est absente des
listes des deux apps de production.

Le CLI signale aussi une ancienne app `pitchou-admin` arrêtée. Ne pas la confondre avec
`pitchou-admin-new`. Les valeurs des secrets et les règles cloud n'ont pas été modifiées.
`cron-tasks` montre les quatre tâches sur chacune des quatre apps, avec des exécutions
récentes de synchronisation et de notifications aussi côté admin. Les commandes de
production utilisent déjà `pnpm` ; celles de staging contiennent encore `corepack pnpm`.
Le code actuel et l'état déployé de staging diffèrent donc sur ce point.

La [documentation Scalingo](https://doc.scalingo.com/platform/app/scm-integration) indique
que l'auto-déploiement attend la réussite des outils CI. `integration-link` confirme les
branches et l'auto-déploiement, mais n'expose pas une liste de checks requis ni un réglage
« wait for CI ». Nous n'avons pas testé un échec CI suivi d'un déploiement bloqué.
L'existence du workflow ne prouve donc pas, à elle seule, une barrière de déploiement.

Le propriétaire doit vérifier dans Deploy → Configuration que les quatre liens ci-dessus
sont toujours corrects et, avec Scalingo si nécessaire, confirmer que les résultats Actions
du SHA poussé bloquent le déploiement en cas d'échec, d'annulation ou d'absence de résultat.
Les déploiements manuels restent une autre voie et ne doivent pas servir à contourner un
échec. Ne pas déclencher un déploiement ou un reset pour vérifier ce point sans accord.
Aucun nouveau secret ou deuxième mécanisme de déploiement n'est nécessaire.

Risques applicatifs conservés pour une décision séparée :

- Instructeur applique les migrations à chaque démarrage. Une migration échouée empêche
  son serveur de démarrer. Admin ne migre pas et peut démarrer avant la nouvelle version
  instructeur. Prévoir des migrations compatibles avec les deux versions pendant la transition.
- Sur staging, chaque démarrage instructeur efface le schéma public et le bucket S3 avant
  migration et seeds. Un redémarrage, une montée en charge ou un rollback peut donc effacer
  les données. Les erreurs de wipe et de seeds sont actuellement non fatales.
- Les deux apps partagent le dépôt et la base, mais leurs déploiements ne sont pas atomiques.
  Une réussite de build ne prouve pas la compatibilité avec les variables et services réels.
- Le [rollback Scalingo](https://doc.scalingo.com/platform/app/rollback) redéploie une image
  précédente. Il ne constitue pas un rollback de la base ni du bucket. Évaluer les migrations
  déjà appliquées et les sauvegardes avant de revenir sur une version.
- `cron.json` est commun aux deux apps et les quatre tâches sont effectivement configurées
  sur les apps admin. Le worker de notifications ignore explicitement `PITCHOU_APP=admin`,
  mais les autres commandes n'ont pas cette garde. Préparer une modification séparée pour
  réserver synchronisation, rétention et sessions à instructeur. Le
  [scheduler Scalingo](https://doc.scalingo.com/platform/app/task-scheduling/scalingo-scheduler)
  lit automatiquement `cron.json` ; un simple réglage de dashboard ne le remplace pas.

Déplacer les migrations vers un hook et rendre le reset staging explicite demandent une
coordination des déploiements. Ce travail reste séparé de la remise à niveau CI.

## Point de départ de l'audit

La branche part de `ffa13206b986c9866d37bbdd5c46abbbc15f4ab2`, après la migration pnpm 12.
Les workflows de test versionnés tournaient uniquement sur les PR. Ils omettaient les composants
et l'intégration HTTP/DB. Svelte ne vérifiait qu'instructeur, sans `--fail-on-warnings`.
Les notifications tournaient déjà, mais dans le job E2E. Celui-ci construisait les apps
avant une recette qui les reconstruisait. Le setup synchronisait les types dans tous les
jobs, même format/lint, et certaines recettes recommençaient cette synchronisation.

La proposition locale `chore/improve-ci` a servi de référence, sans merge ni cherry-pick.
Elle omettait lint et notifications, installait seulement Firefox pour E2E et partageait
des builds sans respecter les origines actuelles. Elle modifiait aussi l'ancienne `.npmrc`,
qui n'existe plus.

L'API publique GitHub indiquait `main` protégée, `staging` non protégée et une liste de
rulesets vide. L'endpoint détaillé de protection répondait 401 ; `gh` n'était pas connecté.
Les contextes requis, les réglages Actions pour les forks, les alertes de sécurité et la
présence d'une file de fusion restent donc inconnus. Les runs historiques de la PR pnpm
étaient verts, ce qui confirme l'exécution de l'ancien périmètre, pas celle de cette branche.
Le [run CodeQL sur main](https://github.com/betagouv/pitchou/actions/runs/40099101731)
avait aussi réussi pour `Analyze (actions)` ; il ne lance pas les recettes de test du dépôt.

## Validation de cette branche

Validation locale du 24 octobre 2026 sous Linux/Nix, Node 24.13.0 et pnpm 12.15.0.
Un checkout séparé sans `.env` et un environnement réduit ont utilisé PostgreSQL 15.7 sur
le port 55433 et RustFS sur le port 59100, dans des conteneurs jetables.

Le run complet `just ci` a réussi :

- Formatage, lint sans warning, longueur des fichiers, TypeScript et Svelte pour les deux apps.
- Builds de production des deux apps, puis builds aux origines propres à chaque suite.
- 1 977 tests unitaires et 312 tests de composants Chromium.
- 100 tests de notifications avec livraison simulée et 311 tests d'intégration HTTP/DB.
- 74 tests E2E, dont le test Chromium de carte, sans retry ni test ignoré.

Les ajustements ultérieurs de reporting et de cleanup ont eu leurs validations ciblées :
`actionlint` 1.7.12, ShellCheck, contrôles statiques, installation verrouillée et `pnpm audit`
sans vulnérabilité connue. Des erreurs TypeScript/Svelte temporaires ont bien fait échouer
les recettes et produit les chemins admin attendus dans les annotations. Le parser de
reviewdog 0.21.0 fixé par le workflow a également été vérifié.

Les probes volontairement en échec sont distinctes du run CI réussi. Le prédicat du job
final accepte seulement `success`. Un serveur admin rendu indisponible a fait échouer le
setup des deux suites, fermé le serveur instructeur déjà démarré et supprimé la base.
Une panne PostgreSQL simulée a conservé à la fois l'erreur de setup et celle de cleanup.
La recette `docker-test-up` a été vérifiée avec son attente bornée. Les conteneurs et volumes
de validation ont été supprimés.

Vitest a signalé une fermeture lente du serveur Vite après les composants, sans échec de
suite. Le run comporte aussi un avertissement de dépréciation pg sur des requêtes
concurrentes. Ces avertissements restent visibles ; aucun contrôle n'a été désactivé.

Ce résultat est local. Aucun run GitHub de la nouvelle CI n'a été déclenché ou déclaré vert.
Sans session GitHub authentifiée, la publication d'une PR et la validation Actions restent
à faire. Les captures de settings Scalingo sont des lectures ; aucun déploiement, reset,
changement cloud ou changement de protection GitHub n'a été effectué.
