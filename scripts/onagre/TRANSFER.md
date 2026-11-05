# Transférer la préparation Onagre

Ce script copie une préparation Onagre vers une copie de production dédiée à la répétition de l'import. Il ne crée aucun dossier Pitchou.

Les deux bases doivent avoir les mêmes migrations de préparation, jusqu'à `20261028120000_onagre-documents.ts`. La migration du registre d'import peut aussi être présente. Le script exclut ce registre.

## Exécution locale

Définir séparément les secrets `ONAGRE_TRANSFER_SOURCE_URL` et `DATABASE_URL` dans l'environnement du terminal. La première URL désigne la préparation source. La seconde désigne la cible de répétition. Le script ne charge pas `.env` automatiquement. Ne pas placer les secrets dans une commande enregistrée dans l'historique.

Déclarer le rôle et le nom exact de la base cible, puis lancer l'aperçu depuis la racine du dépôt.

```sh
export ONAGRE_DEPLOYMENT_ROLE=rehearsal
export ONAGRE_EXPECTED_DATABASE=nom_exact_de_la_base_cible
node --import tsx scripts/onagre/transfer.ts
```

L'aperçu ouvre deux transactions en lecture seule. Il affiche les compteurs des dix tables, le nombre d'auteurs à rapprocher ou à créer, le nombre de règles initiales à remplacer et les empreintes des identités SQL des bases. Il ne charge pas les lignes sources en mémoire et ne modifie pas les bases.

Après vérification de la cible et des compteurs, exécuter avec le même environnement.

```sh
node --import tsx scripts/onagre/transfer.ts --apply
```

Le rôle déclaré est une protection opérateur. Il ne prouve pas que l'hébergement est une répétition. Vérifier les secrets de la cible avant l'exécution. Le script exige que le nom de l'URL cible et `current_database()` correspondent à `ONAGRE_EXPECTED_DATABASE`. Il refuse une source et une cible de même URL, même si les identifiants de connexion diffèrent. Il vérifie aussi leurs identités SQL pour repérer les alias réseau d'une même base.

Les seules options d'URL acceptées concernent TLS, avec `sslmode`, `sslcert`, `sslkey` et `sslrootcert`. Les options qui changent l'hôte ou les paramètres de session sont refusées. Les erreurs affichent un refus contrôlé ou un code d'erreur, jamais l'URL, les valeurs SQL ni les détails bruts du pilote.

## Données reprises

Le script copie toutes les lignes de ces tables, sans filtre sur le dernier snapshot.

| Tables                                                            | Contenu                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `onagre_snapshot`                                                 | Métadonnées du dump et du classeur                           |
| `onagre_source_demande`, `onagre_source_row`                      | Demandes et lignes sources                                   |
| `onagre_mapping`, `onagre_mapping_revision`                       | Correspondances et historique                                |
| `onagre_shared_rule`, `onagre_shared_rule_revision`               | Règles communes et historique                                |
| `onagre_document`, `onagre_document_sheet`, `onagre_document_row` | Documents, originaux binaires enregistrés, texte et feuilles |

Tous les snapshots sources doivent avoir `records_complete=true`. Les colonnes, types, contraintes et noms de tables de préparation doivent correspondre. Une table Onagre inconnue, une partition, une politique de sécurité par ligne ou un déclencheur de préparation cible provoque un refus. Les tables `onagre_import_run` et `onagre_import_identity` sont connues mais exclues.

Les identifiants de préparation restent inchangés, notamment ceux des snapshots, documents et révisions. Les valeurs passent par leur représentation texte PostgreSQL pour conserver les timestamps à la microseconde, les grands nombres JSON et les données binaires.

## Cible vide et auteurs

Toutes les tables de préparation cibles doivent être vides. Une seule exception accepte les neuf règles initiales de la migration des règles communes, avec leurs textes, versions, statuts et dates exacts. Le script vérifie leurs empreintes avant de les remplacer dans la transaction. Une règle modifiée, même sans révision, provoque un refus. Un transfert déjà réalisé est toujours refusé au passage suivant. Il n'existe pas d'option de remplacement, de suppression de schéma ou de remise à zéro.

Seuls les auteurs référencés par les révisions sont lus dans `auth_user`. Le rapprochement utilise l'email normalisé par PostgreSQL avec `lower(btrim(email))`. Un email absent ou ambigu provoque un refus.

Un compte cible qui correspond conserve son profil, son activité et ses permissions. Pour un auteur absent, le script alloue un nouvel identifiant dans la cible et conserve son nom et sa date de création. Il enregistre l'email normalisé, `active=false` et `permissions_configured=true`, sans date de connexion. Les révisions pointent vers cet identifiant cible. Les identifiants numériques de comptes sources ne servent jamais d'identifiants cibles.

Le script ne copie aucune identité ProConnect, session, permission, appartenance à un groupe ou jeton. Le déclencheur existant peut créer les préférences email par défaut d'un compte historique. Le script vérifie que les comptes créés restent inactifs et sans accès. Les autres comptes sources ne sont pas copiés.

## Transactions et volume

La source reste dans une transaction `REPEATABLE READ READ ONLY` pendant tout le transfert. Les modifications concurrentes de la préparation source n'entrent pas dans cette copie.

La cible utilise une seule transaction et verrouille les dix tables de préparation contre les écritures et lectures concurrentes. Elle verrouille aussi `auth_user` contre les écritures. Utiliser une cible de répétition sans trafic applicatif. Une attente de verrou de plus de dix secondes provoque un échec.

Les curseurs lisent au plus 1 000 lignes par lot. Les documents passent un par un pour limiter la mémoire occupée par les originaux binaires. La mémoire dépend donc du lot courant et de la taille du plus gros document, pas du nombre total de lignes. Prévoir de la place pour les données, les index et les journaux PostgreSQL. Le temps dépend aussi de la latence entre le terminal et chaque base.

Chaque compteur cible doit correspondre au compteur source avant le commit. Les lignes JSON `mode=copying` indiquent des lots de tables encore non validés, avec une empreinte du flux transféré après rapprochement des auteurs. Ces empreintes ne servent pas à autoriser un rejeu. Seul le résultat final `mode=applied` confirme le commit.

Les séquences redémarrent après les identifiants présents, sans réduire une avance existante. Le script utilise `ALTER SEQUENCE RESTART`, qui s'annule avec la transaction. Le compte cible doit donc pouvoir modifier ces séquences. Il lui faut aussi les droits de lecture, d'insertion et de verrouillage des tables concernées, et de suppression des seules règles initiales.

Un échec avant le commit annule la copie, les auteurs créés et les changements de séquences. Une perte de connexion pendant le commit peut laisser un résultat inconnu. Dans ce cas le script l'indique et il faut inspecter la cible avant de relancer. Le refus de cible non vide empêche de recommencer aveuglément une copie qui aurait déjà abouti.

## Tests PostgreSQL locaux

Définir `ONAGRE_TRANSFER_TEST_ADMIN_URL` vers un PostgreSQL local jetable avec le droit de créer des bases. Les tests refusent les hôtes hors loopback. Ils créent puis suppriment uniquement leurs bases aux noms uniques `onagre_transfer_test_*`.

```sh
node --import tsx --test scripts/onagre/transfer/*.test.ts
```

Les tests couvrent le rapprochement des auteurs, les documents binaires, les valeurs exactes, les limites de lots, le refus de cible non vide, les règles modifiées, le rollback des séquences et la cohérence du snapshot pendant une modification concurrente. Ils ne se connectent pas aux environnements distants.
