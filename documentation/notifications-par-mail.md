# Notifications par mail

## Préférences et déclenchements

Les trois préférences sont indépendantes et globales au compte. Elles sont activées par défaut. Elles se règlent dans **Mon espace > Paramètres > Notifications**, à `/parametres/notifications`. Une sauvegarde réussie conserve les choix au rechargement.

| Notification                       | Destinataires et rythme                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrivée dans un groupe instructeur | Chaque membre du groupe ayant activé cette option, même sans suivre le dossier. Envoi immédiat après une création admin ou une synchronisation DN, y compris lors d'un transfert réel vers un autre groupe.         |
| Attribution pour suivi             | La personne à qui un tiers attribue le dossier, si son option est activée. Envoi immédiat après validation de l'attribution.                                                                                        |
| Nouveautés                         | Chaque personne suivant le dossier, pour les changements admissibles faits par quelqu'un d'autre. Un mail par personne et dossier, exigible à 06:00 dans `Europe/Paris`, puis traité au prochain passage du worker. |

Les nouveautés comprennent les modifications du formulaire DN, pièces jointes et espèces, les ajouts de pièces jointes dans Pitchou, ainsi que les changements d'Instruction, Avis et Contrôles. Les actions personnelles, le suivi et la génération de documents sont exclus. L'import DN initial ne produit pas de mail de nouveauté. Les changements détectés à partir de 06:00 appartiennent au lot du lendemain, avec changement d'heure automatique.

Les valeurs inchangées, affectations identiques et synchronisations sans changement ne créent pas de doublon. Les dossiers déjà présents, anciens changements et réactivations de préférences ne provoquent pas de rattrapage. Lire une notification dans Pitchou ne supprime pas le mail en attente.

La livraison vérifie à nouveau la préférence et l'accès au dossier. Les attributions et nouveautés exigent toujours le suivi ; les arrivées exigent encore l'accès au groupe concerné. Une désactivation, perte d'accès ou sortie du suivi annule les envois concernés. Un transfert annule les arrivées en attente pour l'ancien groupe.

## Contenu des mails

Les trois modèles partagent le logo Pitchou, un cadre clair avec liseré violet, un lien vers le dossier et un lien de paramètres en italique. Ils annoncent le changement sans détailler le contenu du dossier.

- Arrivée : `Nouveau dossier: N° - Titre`.
- Attribution : `Attribution dossier: N° - Enjeu - Titre`.
- Nouveauté : `Nouveauté: N° - Enjeu - Titre`.

L'enjeu est **À enjeu**, **Sans enjeu** ou **Enjeu à déterminer**. Sans numéro DN, le numéro affiché est l'identifiant Pitchou. Les liens ouvrent `/dossier/ID` et `/parametres/notifications`, sans secret ni capability. Le logo PNG est servi à `/images/pitchou-logo-email.png`. Un message déjà figé pour une première tentative conserve son contenu lors des reprises.

## Configuration

| Variable                  | Usage                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Base de données utilisée par l'application et le worker.                                                                                                                                      |
| `PUBLIC_SITE_URL_PITCHOU` | Origine instructeur des liens de dossier, paramètres et logo dans les mails.                                                                                                                  |
| `BREVO_API_KEY`           | Clé des envois transactionnels, utilisée par l'instructeur, l'admin et le worker. L'expéditeur fixe est `contact@pitchou.beta.gouv.fr`. Aucun template Brevo supplémentaire n'est nécessaire. |
| `PUBLIC_PITCHOU_ENV`      | La valeur `staging` active la protection des destinataires de préproduction.                                                                                                                  |
| `STAGING_EMAIL_ALLOWLIST` | Adresses exactes autorisées en préproduction, séparées par des virgules. Liste vide par défaut, sans domaine ni joker ; casse et espaces ignorés.                                             |
| `MAILPIT_URL`             | Capture locale facultative, uniquement avec `NODE_ENV=development` ou `test`. Voir [la capture des mails en développement](test-email-capture.md).                                            |

En préproduction, tous les destinataires, y compris CC/BCC, doivent être autorisés. Sinon, le message est bloqué avant Brevo et la notification prend l'état `suppressed`, sans tentative ni reprise. Ajouter ensuite une adresse à la liste ne rejoue pas ces messages. `PITCHOU_ADMIN_EMAILS` donne des droits d'administration, sans autoriser la réception de mails. La liste ne restreint pas la production. Les données de démonstration des seeds ne déclenchent pas de notifications.

Le worker instructeur traite au plus 100 candidats par passage. Le cron le lance toutes les dix minutes ; 06:00 est l'heure d'exigibilité, pas une garantie d'envoi à la minute. La même commande ne traite rien lorsque `PITCHOU_APP=admin`.

## Tests automatisés

La suite PostgreSQL utilise les migrations réelles dans la base jetable `pitchou_test_notifications` et simule tous les envois. Le port par défaut est 5433 ; `TEST_DB_PORT` permet de le changer.

```sh
docker compose -f compose.test.yml up -d test_db
pnpm exec just test-email-notifications
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=unit dossierNotificationEmails deployment.test.ts
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=component src/routes/parametres
```

Ces tests couvrent préférences, identité de l'auteur, sauvegardes inchangées ou échouées, arrivées, attributions, regroupement des nouveautés, exclusions, accès, absence de rattrapage, changements d'heure, concurrence, reprises et déduplication. `retrySafety.test.ts` vérifie notamment qu'une réponse perdue suivie d'un rejet 429 ou 401 ne permet pas un nouvel envoi hors fenêtre, tandis que des rejets exclusivement explicites restent réessayables après une panne prolongée.

## Diagnostic et historique

L'administration à `/mails/notifications` utilise la session et les droits admin habituels. Elle affiche les comptes par type/état et 20 lignes par page. Les filtres portent sur le dossier, le destinataire, l'identifiant de notification, le type, l'état, l'environnement et les dates. Les bornes sont inclusives à l'heure de Paris. **Échéance dépassée** inclut les envois en attente dont la reprise est différée. **Historique** montre les transitions et tentatives.

| État         | Sens                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `pending`    | En attente, éventuellement avec une erreur normalisée et une date de reprise.                         |
| `sent`       | Accepté par l'expéditeur, sans preuve de livraison.                                                   |
| `cancelled`  | Envoi annulé, avec un motif tel que préférence désactivée, suivi quitté ou accès perdu.               |
| `suppressed` | Destinataire non autorisé en préproduction, sans nouvel essai automatique.                            |
| `uncertain`  | Une tentative a pu être acceptée sans confirmation ; réconciliation nécessaire auprès du prestataire. |

Les erreurs sont journalisées avec l'identifiant de notification. Une tentative échouée attend au moins une minute avant reprise. Le corps et la clé d'idempotence restent identiques. Une réservation expirée est récupérable après deux minutes. Après une première tentative ambiguë, les reprises automatiques s'arrêtent à 25 minutes et passent à `uncertain`. Un rejet explicite ultérieur ne peut pas effacer cette première date. Si toutes les tentatives sont explicitement rejetées, les reprises prolongées restent possibles. Consulter les journaux transactionnels du prestataire avant toute intervention sur un envoi incertain.

La commande suivante liste les candidats exigibles sans envoi ni modification de la file. Elle demande `DATABASE_URL` et `PUBLIC_SITE_URL_PITCHOU`, sans clé Brevo, et retourne `dryRun: true` avec `candidates`.

```sh
pnpm --filter @pitchou/worker exec tsx send-dossier-notification-emails.ts --dry-run
```

L'état durable est dans `email_notification_outbox`, les tentatives dans `email_notification_history` et les changements de préférences dans `email_notification_settings_history`. `attempt_count`, `provider_message_id`, `last_error` et `cancellation_reason` permettent de diagnostiquer un envoi sans consulter son HTML.

Les événements AARRI serveur sont `notificationEmailQueued`, `notificationEmailSent`, `notificationEmailFailed`, `notificationEmailCancelled`, `notificationEmailUncertain`, `notificationEmailSuppressed` et `notificationEmailSettingsChanged`. Les transitions sont enregistrées avec l'outbox. Une sauvegarde authentifiée ne produit un événement que si elle réussit et modifie un choix, avec les seules valeurs avant/après et la date serveur.

Les événements système sont attribués au destinataire avec `source: system` et `attribution: recipient`, sans compter comme une action utilisateur. L'environnement distingue les activités réelles des tests. Aucune adresse, corps HTML, secret ou erreur brute du prestataire n'entre dans ces événements. L'administration retrouve l'identité du destinataire par une jointure protégée. Aucun suivi de livraison, rebond, ouverture ou clic n'est ajouté.
