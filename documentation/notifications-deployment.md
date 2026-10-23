# Déploiement autonome des notifications

Cette branche inclut le cadre des paramètres, Général et Notifications, leurs composants, les routes HTML et JSON, l'administration des envois, le worker et les migrations. Aucun fichier, déploiement ou merge de `feat/admin-managed-groupes-instructeurs` n'est nécessaire. Mes groupes pourra être ajouté plus tard. Il n'y a pas de changement de version applicative à effectuer.

## Configuration inspectée sans modification

État lu sur Scalingo `osc-secnum-fr1` le 22 octobre 2026. Aucune valeur secrète n'est conservée dans ce document. La comparaison a porté sur les variables et les listes de crons, sans exécuter de commande dans les applications ni envoyer de mail.

| Application           | Rôle                      | Base partagée               | Clé Brevo présente | Origine instructeur                    | Protection préproduction            |
| --------------------- | ------------------------- | --------------------------- | ------------------ | -------------------------------------- | ----------------------------------- |
| pitchou               | instructeur production    | Oui, avec pitchou-admin-new | Oui                | https://pitchou.beta.gouv.fr           | Non applicable                      |
| pitchou-admin-new     | admin production          | Oui, avec pitchou           | **Non**            | https://pitchou.beta.gouv.fr           | Non applicable                      |
| pitchou-staging       | instructeur préproduction | Oui, avec son admin         | Oui                | https://staging.pitchou.incubateur.net | staging et liste de 2 adresses      |
| pitchou-admin-staging | admin préproduction       | Oui, avec son instructeur   | Oui                | https://staging.pitchou.incubateur.net | staging et même liste de 2 adresses |

La lecture du 22 octobre avait relevé l'absence de `BREVO_API_KEY` sur `pitchou-admin-new`. Le propriétaire a ensuite confirmé l'ajout d'une clé valide et l'autorisation de l'expéditeur contact. Ces prérequis sont levés selon sa confirmation. L'admin envoie immédiatement les arrivées qu'il crée ; sans clé, l'outbox reste durable mais attend la reprise par le worker. Les clés déjà présentes n'ont pas été utilisées pour vérifier leur validité ni leur autorisation chez Brevo. L'expéditeur fixe `contact@pitchou.beta.gouv.fr` doit être autorisé chez Brevo ; le propriétaire l'a confirmée, sans nouvel appel Brevo ni envoi réel de l'agent pour la vérifier.

`DATABASE_URL` et `PUBLIC_SITE_URL_PITCHOU` doivent être présents sur les deux applications et dans leurs tâches planifiées. Les bases partagées et ces origines ont été confirmées par lecture de configuration. Les URLs contiennent les liens de dossier, de paramètres et du logo public. `NODE_ENV=production` est attendu à l'exécution, sans `MAILPIT_URL` ni `FLEET_PITCHOU_CONTEXT`. Aucune variable Mailpit n'était configurée dans les quatre applications. La valeur runtime injectée de `NODE_ENV` n'a pas été inspectée dans un conteneur.

En préproduction, conserver `PUBLIC_PITCHOU_ENV=staging` et une `STAGING_EMAIL_ALLOWLIST` d'adresses exactes sur les deux applications. Toute adresse non autorisée, y compris CC/BCC, bloque le message avant Brevo. L'ajout ultérieur à la liste ne rejoue pas les messages bloqués. En production, cette liste ne limite pas les destinataires. Les seeds marquent leurs actions et leur groupe initial pour ne pas créer de notifications de démonstration. Ne pas utiliser les seeds pour préparer une base de production.

## Ordre de mise en service

1. Vérifier la sauvegarde habituelle de la base et conserver la clé Brevo de l'admin confirmée par le propriétaire. Les vérifications de sauvegarde et de configuration à appliquer appartiennent au déploiement ; cet audit n'a rien déployé ni modifié à distance.
2. Appliquer les cinq migrations depuis les sources de cette branche, dans leur ordre Knex, **avant** le nouveau worker et l'admin. Commande de migration existante : `corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js migrate:latest --env production`, avec l'environnement cible. Aucune commande de wipe ou seed en production.
3. Déployer l'instructeur puis l'admin sur la même base. `scripts/start.sh` relance les migrations côté instructeur et s'arrête si elles échouent. L'admin n'applique pas les migrations. En préproduction seulement, le démarrage conserve le mécanisme existant de remise à zéro et de seed ; ce comportement ne s'applique pas à la production.
4. Vérifier le cron de l'instructeur et les URLs de l'application avant la recette d'envoi autorisée. La nouvelle commande de notification apparaît automatiquement après déploiement de `cron.json`. Si le Scheduler démarre avant la fin des migrations, une exécution échoue sans envoi puis reprend au passage suivant ; la migration préalable évite cette fenêtre.

| Migration                                        | Effet sur les données présentes                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 20261014120000_email-notification-preferences.ts | Initialise assignment et novelty à true pour les personnes présentes et futures.                                                    |
| 20261014121000_email-notification-outbox.ts      | Ajoute la file et les triggers sur les nouvelles actions, sans parcourir les anciennes actions.                                     |
| 20261021120000_group-arrival-emails.ts           | Ajoute arrival=true ; mémorise les groupes déjà affectés sans envoyer les dossiers historiques ; conserve les deux choix existants. |
| 20261022140000_notification-observability.ts     | Ajoute tentatives, identifiant prestataire, environnement, raisons et historique ; ne reconstitue pas les événements anciens.       |
| 20261022160000_staging-email-protection.ts       | Autorise le statut suppressed, utilisé par le code avant livraison en préproduction.                                                |

Les migrations utilisent les transactions Knex. Leurs DDL prennent des verrous et l'initialisation parcourt les personnes et relations de groupe présentes ; la durée sur la base de production n'est pas mesurée. Les nouvelles activités postérieures aux migrations peuvent alimenter la file, sans rattrapage du passé. Les trois préférences sont actives par défaut, ce qui autorise les prochains envois réels dès l'activation du code et du worker.

## Worker et transactions

Commande : `corepack pnpm --filter @pitchou/worker exec tsx send-dossier-notification-emails.ts`. Le paquet worker déclare ses dépendances runtime, dont tsx et @pitchou/server. `--dry-run` lit les candidats exigibles sans les réclamer, modifier ou envoyer. Il affiche des identifiants, pas les contenus de messages.

Le cron est `*/10 * * * *`, taille S, avec quatre tâches au total. [Scalingo Scheduler](https://doc.scalingo.com/platform/app/task-scheduling/scalingo-scheduler) impose au moins dix minutes et au plus cinq tâches. L'heure de cron est UTC ; la date d'exigibilité des nouveautés vient de PostgreSQL en Europe/Paris. Le mail devient exigible à 06:00, puis part au passage suivant, avec le délai du Scheduler. Une heure d'envoi exactement à 06:00 n'est pas garantie. Les listes de crons lues montrent le nouveau job déjà en préproduction mais pas encore en production.

Le même cron racine existe dans les deux applications. Sur `PITCHOU_APP=admin`, cette commande retourne `{"skipped":"admin"}` sans toucher à la file. L'instructeur traite au plus cent candidats par exécution. Le code accepte aussi l'absence de PITCHOU_APP pour les usages locaux existants.

L'action et la mise en file sont validées dans la même transaction. Les arrivées et attributions appellent le dispatcher après commit ; un échec de livraison n'annule pas l'action et le cron reprend. La sélection vérifie à nouveau préférences, suivi et accès. Une réservation utilise `FOR UPDATE SKIP LOCKED`, expire après deux minutes, fige le contenu et conserve la même clé d'idempotence. Les reprises attendent au moins une minute mais le cron peut les traiter plus tard. Une réponse ambiguë cesse d'être reprise après vingt-cinq minutes et demande une réconciliation manuelle. Un rejet ultérieur conserve cette première date ambiguë ; seuls des rejets exclusivement explicites permettent des reprises prolongées. Cette distinction utilise la date persistée avant la réservation, sans migration supplémentaire. Les tests simulent concurrence, panne, reprise et réponse perdue.

Les changements de paramètres produisent les valeurs avant/après avec l'identité serveur, après sauvegarde réussie seulement. Les événements de file suivent la transaction de l'outbox. Les statistiques système sont attribuées au destinataire sans inventer d'action utilisateur. Les tests vérifient l'absence d'adresse, contenu, secret et erreur brute dans l'analytique.

## Retour arrière et limites

Pour un retour arrière applicatif, arrêter d'abord le worker de cette fonctionnalité, conserver le schéma additif et ses données, puis restaurer le code précédent selon la procédure habituelle. Cela n'annule pas un mail déjà accepté. Examiner les lignes pending et uncertain avant une nouvelle activation ; ne pas remettre toute la file à pending. Une réactivation peut reprendre les nouvelles activités enregistrées entre-temps.

Les fonctions down sont testées sur une base jetable, sans être la procédure de retour arrière de production. Le down de protection transforme suppressed en cancelled sans les réactiver. Le down d'observabilité conserve les identifiants, statuts et corps de l'outbox mais supprime l'historique et ses colonnes supplémentaires. Le down des arrivées supprime ses notifications et son état de référence ; sa réapplication ne reconstitue pas ces envois. Les deux premières migrations suppriment file et préférences. Ne pas exécuter ces down avec le nouveau code ou worker encore actif. Le maintien de l'outbox envoyée préserve la déduplication.

L'extension Fleet est un plugin Vite `apply: serve`, gardé par le contexte de checkout, la base isolée et Mailpit local. Aucun endpoint de test n'est enregistré par le serveur de production construit. La capture refuse NODE_ENV=production et ne se rabat jamais sur Brevo en cas d'échec local. Les tests couvrent ces refus. Aucun envoi réel, changement de configuration distante ou déploiement n'est réalisé par cet audit.
