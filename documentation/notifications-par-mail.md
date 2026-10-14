# Notifications par mail

Les paramètres sont globaux au compte. Les deux options valent `true` pour les comptes existants à la migration et pour les nouvelles personnes créées ensuite. Les anciens changements et suivis ne déclenchent aucun rattrapage.

## Déploiement

Le démarrage de l'application instructeur applique les deux migrations `20261014120000_email-notification-preferences.ts` et `20261014121000_email-notification-outbox.ts`. Pour les appliquer en développement, utiliser `pnpm exec just db-migrate-latest`.

Configurer `BREVO_API_KEY` et `PUBLIC_SITE_URL_PITCHOU` dans l'application instructeur et ses tâches planifiées. L'expéditeur existant `contact@pitchou.beta.gouv.fr` doit être autorisé dans Brevo. Les deux modèles sont fixes dans le code et ne demandent aucun nouveau template Brevo.

Déployer le nouveau `cron.json` sur l'application instructeur. Le worker tourne chaque minute, traite jusqu'à 100 messages par passage et reprend les envois échoués. Les nouveautés deviennent exigibles à 06:00 dans `Europe/Paris`, avec changement d'heure automatique. Un changement détecté à partir de 06:00 appartient au prochain envoi du lendemain. Les attributions sont envoyées après la validation de la transaction HTTP, puis reprises par le worker si nécessaire.

Les imports DN initiaux, même marqués comme baseline en fin de synchronisation, sont exclus. Les modifications DN portent l'attribution pétitionnaire de l'historique existant. Les modifications faites dans Pitchou utilisent l'identifiant serveur de la personne ayant effectué l'action. La lecture des notifications dans Pitchou ne supprime pas les mails en attente.

## Recette des parcours

Utiliser deux comptes instructeurs A et B du même groupe, dans deux sessions de navigateur. Prévoir deux dossiers accessibles à ce groupe, dont un dossier DN, ainsi qu'une décision administrative, une prescription et un contrôle pour tester l'onglet Contrôle. Remplacer `ID` par l'identifiant Pitchou du dossier. Pour vérifier la réception réelle, utiliser uniquement des destinataires de recette et un environnement Brevo contrôlé. Les tests automatisés ci-dessous simulent tous les envois.

| Parcours                                  | Page et actions                                                                                                                                                                                                                                                            | Résultat attendu                                                                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Préférences                               | Avec B, ouvrir **Mon espace > Paramètres**, lien avec roue crantée, ou `/parametres`. Dans **Notifications par mail**, choisir Désactivé pour les attributions et Activé pour les nouveautés, puis Enregistrer. Recharger. Inverser ensuite les deux choix et enregistrer. | Confirmation d'enregistrement, choix conservés au rechargement, options indépendantes. A conserve ses propres choix. Un compte neuf a les deux options Activé.                                                                                |
| Erreurs des paramètres                    | Sur `/parametres`, couper le réseau après le chargement, modifier un choix et cliquer Enregistrer. Rétablir le réseau et réessayer. Tester aussi le chargement de la page hors ligne et l'accès après déconnexion.                                                         | Message d'échec, possibilité de réessayer, confirmation au retour du réseau. Le chargement échoué invite à recharger. Un accès sans compte connecté redirige vers `/connexion`.                                                               |
| Attribution par un tiers                  | Activer les attributions pour B. B ne doit pas suivre le dossier. Avec A, ouvrir `/tous-les-dossiers` ou `/dossier/ID`, menu **Plus d'actions > Faire suivre le dossier**, ajouter B, puis **Attribuer le dossier**. Réouvrir et valider sans changement.                  | Un seul mail immédiat à B, aucun à A. Aucun second mail pour une validation identique. Objet `Attribution dossier: N° - À enjeu, Sans enjeu ou Enjeu à déterminer - Titre`. Le corps contient le lien `/dossier/ID` et le lien `/parametres`. |
| Attribution désactivée et suivi personnel | Désactiver les attributions pour B, retirer B du suivi et le réattribuer depuis A. Tester également le bouton de suivi personnel avec B.                                                                                                                                   | Aucun mail d'attribution lorsque cette option est désactivée. Aucun mail pour son propre suivi. Aucun mail de nouveauté pour une modification du suivi.                                                                                       |
| Instruction                               | B suit le dossier et active les nouveautés. Avec A, ouvrir `/dossier/ID?tab=instruction`, changer Enjeu, une date de prochaine échéance, un champ d'instruction ou ajouter un commentaire. Les champs se sauvegardent dans le parcours existant.                           | Un mail de nouveauté à B lors du prochain passage à 06:00 à Paris. Plusieurs changements avant cette échéance donnent un seul mail pour ce dossier. Aucun mail pour A sur ses propres changements.                                            |
| Avis                                      | Avec A, ouvrir `/dossier/ID?tab=avis`, modifier un avis, puis Sauvegarder. Tester également Ajouter un avis ou une saisine avec un fichier de recette.                                                                                                                     | Un mail de nouveauté à B à la prochaine échéance de 06:00, regroupé avec les autres changements du même dossier.                                                                                                                              |
| Contrôle et décisions                     | Avec A, ouvrir `/dossier/ID?tab=controles`, modifier un contrôle, une prescription ou les informations d'une décision administrative, puis valider dans le formulaire existant.                                                                                            | Un mail de nouveauté à B à 06:00. Les sauvegardes strictement identiques ne créent pas de nouveauté.                                                                                                                                          |
| Pièces jointes Pitchou                    | Avec A, ouvrir `/dossier/ID?tab=pieces-jointes`, cliquer Ajouter une pièce jointe, choisir un fichier et valider. Tester un type Autre, un avis, une saisine et une décision.                                                                                              | Un mail de nouveauté à B à 06:00, quel que soit le point d'entrée de l'ajout. Le mail ne contient pas les pièces jointes ni leur contenu.                                                                                                     |
| Formulaire DN                             | Sur le formulaire DN du dossier déjà importé, faire modifier un champ par le pétitionnaire, puis synchroniser. Répéter avec une pièce jointe et les espèces. Observer `/dossier/ID?tab=detail-du-projet`.                                                                  | Un mail de nouveauté par dossier suivi à 06:00. Une synchronisation sans modification, les annotations renvoyées par Pitchou et le premier import du dossier ne déclenchent aucun mail de nouveauté.                                          |
| Exclusions et regroupement                | Avec B, modifier son propre dossier. Avec A, utiliser `/dossier/ID?tab=generation-document`. Tester un dossier que B ne suit pas. Modifier ensuite les deux dossiers suivis par B avant 06:00.                                                                             | Aucun mail pour les actions personnelles de B, la génération de documents ou un dossier non suivi. Deux dossiers modifiés donnent deux mails, un par dossier. Le lendemain sans nouvelle modification ne produit aucun nouvel envoi.          |
| Désactivation avant envoi                 | Après un changement par A, B désactive les nouveautés puis Enregistrer, ou quitte le suivi avant 06:00. Réactiver ou reprendre le suivi sans nouveau changement.                                                                                                           | L'envoi en attente est annulé. La réactivation seule ne ressuscite pas les anciennes nouveautés. Un nouveau changement admissible peut créer un nouvel envoi. La perte d'accès au groupe instructeur bloque aussi l'envoi.                    |

L'objet des nouveautés est `Nouveauté: N° - À enjeu, Sans enjeu ou Enjeu à déterminer - Titre`. Le texte annonce seulement du nouveau sur le dossier. Les deux liens ouvrent le dossier et les paramètres, sans secret ni capability dans le mail. Pour un dossier sans numéro DN, le mail utilise l'identifiant Pitchou.

La synchronisation DN conserve sa commande existante, à exécuter dans l'environnement de recette après une modification du formulaire.

```sh
pnpm --filter @pitchou/worker exec tsx sync-demarche-numerique.ts --IdSchemaDS derogation-especes-protegees
```

## Vérifications sans envoyer de mail

Démarrer PostgreSQL de test, puis lancer les tests. Ils créent et suppriment uniquement la base `pitchou_test_notifications`, utilisent les migrations réelles et simulent Brevo. Le port par défaut est 5433. `TEST_DB_PORT` permet de choisir un autre port.

```sh
docker compose -f compose.test.yml up -d test_db
pnpm exec just test-email-notifications
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=unit
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=component src/routes/parametres src/routes/Layout/Header/CompactHeader.svelte.test.ts
```

La suite PostgreSQL vérifie les attributions réelles via l'endpoint, les valeurs inchangées sur Instruction, Avis, Contrôle, prescriptions, décisions et commentaires, les préférences, les exclusions, les baselines DN, le rollback, le regroupement, les changements d'heure, les reprises après erreur, les workers concurrents et l'absence de répétition après succès.

Inspecter les messages exigibles sans envoi ni modification de la file. La commande demande `DATABASE_URL` et `PUBLIC_SITE_URL_PITCHOU`, mais pas de clé Brevo.

```sh
pnpm --filter @pitchou/worker exec tsx send-dossier-notification-emails.ts --dry-run
```

Résultat observable, un objet JSON avec `dryRun: true` et `candidates`. Avant 06:00, les nouveautés programmées ne figurent pas dans cette liste. Les attributions en attente y figurent immédiatement. Consulter aussi les états persistés.

```sh
psql "$DATABASE_URL" -c 'SELECT id, kind, dossier, personne, status, due_at, retry_at, first_attempt_at, sent_at, last_error FROM email_notification_outbox ORDER BY due_at;'
```

## Reprise et surveillance

Un succès passe le message à `sent`. Une préférence désactivée, un suivi quitté ou un accès révoqué entraîne `cancelled`. Une réponse explicite de rejet permet une reprise après une minute, y compris après une panne prolongée. Chaque tentative conserve le même corps et la même clé de déduplication.

Une réponse perdue peut masquer un envoi accepté. Les tentatives automatiques s'arrêtent après 25 minutes et passent le message à `uncertain`, avant l'expiration de 30 minutes documentée par [Brevo](https://developers.brevo.com/docs/heterogenous-versions-batch-emails). Un worker interrompu retrouve sa réservation après deux minutes. Vérifier les envois `uncertain` dans les journaux transactionnels Brevo, avec le destinataire, l'objet, la période de tentative et le tag `dossier-assignment` ou `dossier-novelty`. Confirmer l'envoi avant de marquer la ligne `sent`, ou confirmer son absence avant de remettre `status` à `pending`, `first_attempt_at` et `claimed_at` à `NULL`. Ne pas remettre toute la file en attente.

Les erreurs sont journalisées avec l'identifiant de l'envoi. Le worker retourne un code non nul si une tentative échoue. Il conserve les lignes envoyées pour empêcher un rattrapage involontaire lors d'une nouvelle exécution.
