# Notifications par mail

Les paramètres sont globaux au compte. Les trois options sont activées par défaut pour les nouvelles personnes. La migration des arrivées active cette nouvelle option pour les comptes existants sans modifier leurs choix d'attribution et de nouveautés. Les anciens changements, suivis et dossiers déjà dans un groupe ne déclenchent aucun rattrapage.

## Déploiement

Le démarrage de l'application instructeur applique les migrations `20261014120000_email-notification-preferences.ts`, `20261014121000_email-notification-outbox.ts` et `20261021120000_group-arrival-emails.ts`. Pour les appliquer en développement, utiliser `pnpm exec just db-migrate-latest`. La dernière migration est nécessaire avant de charger les nouveaux paramètres, qui lisent la colonne `arrival`.

Configurer `BREVO_API_KEY` et `PUBLIC_SITE_URL_PITCHOU` dans les applications instructeur, admin et les tâches planifiées. L'expéditeur existant `contact@pitchou.beta.gouv.fr` doit être autorisé dans Brevo. Les trois modèles sont fixes dans le code et ne demandent aucun nouveau template Brevo.

Déployer le nouveau `cron.json` sur l'application instructeur. Le worker tourne chaque minute, traite jusqu'à 100 messages par passage et reprend les envois échoués. Les nouveautés deviennent exigibles à 06:00 dans `Europe/Paris`, avec changement d'heure automatique. Un changement détecté à partir de 06:00 appartient au prochain envoi du lendemain. Les attributions sont envoyées après la validation de la transaction HTTP, puis reprises par le worker si nécessaire.

Les arrivées sont envoyées après validation de la transaction de création admin ou de synchronisation DN. Chaque membre du groupe ayant une adresse mail et l'option activée reçoit un mail, même sans suivre le dossier. Un transfert réel vers un autre groupe notifie ses membres. Une sauvegarde admin ou une synchronisation DN conservant le même groupe ne renvoie rien. La file persistante assure les reprises par le worker, avec les mêmes protections que les attributions.

Les imports DN initiaux, même marqués comme baseline en fin de synchronisation, sont exclus. Les modifications DN portent l'attribution pétitionnaire de l'historique existant. Les modifications faites dans Pitchou utilisent l'identifiant serveur de la personne ayant effectué l'action. La lecture des notifications dans Pitchou ne supprime pas les mails en attente.

## Présentation des paramètres

Ouvrir **Mon espace > Paramètres**, ou directement `/parametres`. La page affiche un panneau centré, avec trois réglages, **Nouveaux dossiers dans mon groupe instructeur**, **Attributions de dossiers** et **Nouveautés sur mes dossiers suivis**. Chaque réglage présente son explication, sa fréquence et les choix Activé et Désactivé. Sur ordinateur, les choix des trois lignes sont alignés à droite. Sur mobile, ils passent sous le texte sans défilement horizontal. Vérifier cette disposition à 320 px, 768 px et sur grand écran, en thèmes clair et sombre. Le bouton Enregistrer se trouve en bas du panneau, avec la confirmation ou l'erreur d'enregistrement.

## Recette des parcours

### Présentation des trois mails

Les arrivées, attributions et nouveautés partagent un cadre blanc sur fond clair, un liseré violet, le logo Pitchou et un titre bleu. Le numéro et le titre du dossier forment un grand lien dans un bloc violet clair. Le lien des paramètres reste en bas, en italique et dans une couleur plus discrète. Les objets et les phrases des trois modèles sont conservés.

Dans `/__fleet/mail/`, ouvrir un **nouveau** message de chaque type. Vérifier le logo sans déformation, le titre correspondant au type de notification, le texte, le lien du dossier et le pied de mail en italique. Cliquer le bloc du dossier puis le lien des paramètres, qui doivent ouvrir respectivement `/dossier/ID` et `/parametres`. Vérifier à 320 px et sur ordinateur, y compris avec un titre de dossier long. Lorsque les images sont bloquées, le texte alternatif « Pitchou », le contenu et les deux liens restent utilisables.

Le logo est un PNG transparent en double résolution, exporté depuis `libs/ui/src/pitchou-logo.svg`, servi par l'application instructeur à `/images/pitchou-logo-email.png`. L'URL utilise `PUBLIC_SITE_URL_PITCHOU`. Les styles sont intégrés au HTML et la mise en page utilise des tableaux de présentation, sans police distante ni SVG dans les mails. Les anciens messages déjà reçus restent tels quels. Un message dont la première tentative a déjà figé le contenu conserve également ce contenu lors des reprises.

Dans l'aperçu de cette tâche, trois exemples locaux portant le tag **apercu-visuel** permettent de comparer les modèles sur le dossier 13, **Test2**. Ces exemples ne modifient ni le suivi ni les préférences et n'ont été envoyés à aucun serveur externe. Les rendus réels Outlook, Gmail et les transformations de couleurs de leurs modes sombres restent à vérifier dans ces clients.

### Déclenchements

Utiliser deux comptes instructeurs A et B du même groupe, dans deux sessions de navigateur. Prévoir deux dossiers accessibles à ce groupe, dont un dossier DN, ainsi qu'une décision administrative, une prescription et un contrôle pour tester l'onglet Contrôle. Remplacer `ID` par l'identifiant Pitchou du dossier. Pour vérifier la réception réelle, utiliser uniquement des destinataires de recette et un environnement Brevo contrôlé. Les tests automatisés ci-dessous simulent tous les envois.

| Parcours                                  | Page et actions                                                                                                                                                                                                                                                                                                         | Résultat attendu                                                                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Préférences                               | Avec B, ouvrir **Mon espace > Paramètres**, lien avec roue crantée, ou `/parametres`. Dans **Notifications par mail**, désactiver **Nouveaux dossiers dans mon groupe instructeur**, garder les deux autres options actives, puis Enregistrer. Recharger. Tester ensuite les attributions et nouveautés indépendamment. | Confirmation d'enregistrement, choix conservés au rechargement, options indépendantes. A conserve ses propres choix. Un compte neuf a les trois options Activé.                                                                               |
| Erreurs des paramètres                    | Sur `/parametres`, couper le réseau après le chargement, modifier un choix et cliquer Enregistrer. Rétablir le réseau et réessayer. Tester aussi le chargement de la page hors ligne et l'accès après déconnexion.                                                                                                      | Message d'échec, possibilité de réessayer, confirmation au retour du réseau. Le chargement échoué invite à recharger. Un accès sans compte connecté redirige vers `/connexion`.                                                               |
| Attribution par un tiers                  | Activer les attributions pour B. B ne doit pas suivre le dossier. Avec A, ouvrir `/tous-les-dossiers` ou `/dossier/ID`, menu **Plus d'actions > Faire suivre le dossier**, ajouter B, puis **Attribuer le dossier**. Réouvrir et valider sans changement.                                                               | Un seul mail immédiat à B, aucun à A. Aucun second mail pour une validation identique. Objet `Attribution dossier: N° - À enjeu, Sans enjeu ou Enjeu à déterminer - Titre`. Le corps contient le lien `/dossier/ID` et le lien `/parametres`. |
| Attribution désactivée et suivi personnel | Désactiver les attributions pour B, retirer B du suivi et le réattribuer depuis A. Tester également le bouton de suivi personnel avec B.                                                                                                                                                                                | Aucun mail d'attribution lorsque cette option est désactivée. Aucun mail pour son propre suivi. Aucun mail de nouveauté pour une modification du suivi.                                                                                       |
| Instruction                               | B suit le dossier et active les nouveautés. Avec A, ouvrir `/dossier/ID?tab=instruction`, changer Enjeu, une date de prochaine échéance, un champ d'instruction ou ajouter un commentaire. Les champs se sauvegardent dans le parcours existant.                                                                        | Un mail de nouveauté à B lors du prochain passage à 06:00 à Paris. Plusieurs changements avant cette échéance donnent un seul mail pour ce dossier. Aucun mail pour A sur ses propres changements.                                            |
| Avis                                      | Avec A, ouvrir `/dossier/ID?tab=avis`, modifier un avis, puis Sauvegarder. Tester également Ajouter un avis ou une saisine avec un fichier de recette.                                                                                                                                                                  | Un mail de nouveauté à B à la prochaine échéance de 06:00, regroupé avec les autres changements du même dossier.                                                                                                                              |
| Contrôle et décisions                     | Avec A, ouvrir `/dossier/ID?tab=controles`, modifier un contrôle, une prescription ou les informations d'une décision administrative, puis valider dans le formulaire existant.                                                                                                                                         | Un mail de nouveauté à B à 06:00. Les sauvegardes strictement identiques ne créent pas de nouveauté.                                                                                                                                          |
| Pièces jointes Pitchou                    | Avec A, ouvrir `/dossier/ID?tab=pieces-jointes`, cliquer Ajouter une pièce jointe, choisir un fichier et valider. Tester un type Autre, un avis, une saisine et une décision.                                                                                                                                           | Un mail de nouveauté à B à 06:00, quel que soit le point d'entrée de l'ajout. Le mail ne contient pas les pièces jointes ni leur contenu.                                                                                                     |
| Formulaire DN                             | Sur le formulaire DN du dossier déjà importé, faire modifier un champ par le pétitionnaire, puis synchroniser. Répéter avec une pièce jointe et les espèces. Observer `/dossier/ID?tab=detail-du-projet`.                                                                                                               | Un mail de nouveauté par dossier suivi à 06:00. Une synchronisation sans modification, les annotations renvoyées par Pitchou et le premier import du dossier ne déclenchent aucun mail de nouveauté.                                          |
| Exclusions et regroupement                | Avec B, modifier son propre dossier. Avec A, utiliser `/dossier/ID?tab=generation-document`. Tester un dossier que B ne suit pas. Modifier ensuite les deux dossiers suivis par B avant 06:00.                                                                                                                          | Aucun mail pour les actions personnelles de B, la génération de documents ou un dossier non suivi. Deux dossiers modifiés donnent deux mails, un par dossier. Le lendemain sans nouvelle modification ne produit aucun nouvel envoi.          |
| Désactivation avant envoi                 | Après un changement par A, B désactive les nouveautés puis Enregistrer, ou quitte le suivi avant 06:00. Réactiver ou reprendre le suivi sans nouveau changement.                                                                                                                                                        | L'envoi en attente est annulé. La réactivation seule ne ressuscite pas les anciennes nouveautés. Un nouveau changement admissible peut créer un nouvel envoi. La perte d'accès au groupe instructeur bloque aussi l'envoi.                    |

L'objet des nouveautés est `Nouveauté: N° - À enjeu, Sans enjeu ou Enjeu à déterminer - Titre`. Le texte annonce seulement du nouveau sur le dossier. Les deux liens ouvrent le dossier et les paramètres, sans secret ni capability dans le mail. Pour un dossier sans numéro DN, le mail utilise l'identifiant Pitchou.

La synchronisation DN conserve sa commande existante, à exécuter dans l'environnement de recette après une modification du formulaire.

```sh
pnpm --filter @pitchou/worker exec tsx sync-demarche-numerique.ts --IdSchemaDS derogation-especes-protegees
```

### Arrivée dans un groupe instructeur

Utiliser les comptes A et B membres d'un même groupe G, sans suivi sur le dossier à créer, et un compte C d'un autre groupe H. Activer les arrivées pour A et désactiver cette option pour B dans `/parametres`, puis enregistrer. Les deux autres choix peuvent rester activés. Dans l'aperçu Fleet, utiliser uniquement la boîte locale `/__fleet/mail/`, sans envoi externe réel.

1. Dans l'application admin, ouvrir **Dossiers** à `/dossiers`, puis **Créer un dossier**. Saisir **Nom du dossier**, choisir G dans **Groupe instructeurs**, renseigner un porteur personne physique avec nom et prénoms, puis **Créer le dossier**. Un mail immédiat arrive pour A, aucun pour B ni C. A n'a pas besoin de suivre le dossier. Le sujet est `Nouveau dossier: ID - Titre`, sans enjeu. Pour un dossier natif sans numéro DN, `ID` est l'identifiant Pitchou.
2. Ouvrir le mail. Il commence par **Bonjour,** puis **Un nouveau dossier vient d’arriver dans Pitchou et attend d'être suivi par un-e instructeur-trice:**. Le lien du dossier ouvre `/dossier/ID` dans l'application instructeur, et le lien de paramétrage ouvre `/parametres`.
3. Depuis le détail admin `/dossiers/ID`, cliquer **Enregistrer** sans changer le groupe. Aucun nouveau mail d'arrivée ne doit apparaître. Réactiver ensuite les arrivées pour B et enregistrer dans `/parametres`. Cette réactivation seule ne renvoie pas les dossiers déjà arrivés. Créer un second dossier pour G, A et B reçoivent chacun un mail.
4. Tester aussi la création complète à `/dossiers/nouveau`, avec G et les champs obligatoires, puis **Créer le dossier**. Le résultat est identique au formulaire minimal.
5. Pour DN, faire arriver un nouveau dossier de recette dans G, puis exécuter la commande de synchronisation ci-dessus. A et B reçoivent le mail avec le numéro DN. Relancer la synchronisation sans changement de groupe, aucun nouvel envoi d'arrivée. Le premier import ne crée toujours aucun mail de nouveauté.
6. Dans DN, transférer le dossier vers H, puis synchroniser. Seuls les membres de H ayant activé les arrivées reçoivent ce nouvel envoi. Un retour ultérieur vers G déclenche une nouvelle arrivée pour A et B. Un membre ayant perdu son accès au groupe ou désactivé l'option avant une reprise ne reçoit pas l'envoi en attente. Quitter le suivi seul n'annule pas un mail d'arrivée.

La migration ne doit pas envoyer les dossiers déjà présents. Vérifier la file après migration, avant de créer un nouveau dossier. Les tests PostgreSQL couvrent aussi les sauvegardes admin qui suppriment puis recréent la relation de groupe dans une même transaction, sans doublon.

## Vérifications sans envoyer de mail

### Bouton de test dans l'aperçu Fleet

Dans l'application instructeur de l'aperçu, ouvrir `/__fleet/accounts`, section **Tester les mails de nouveautés**. Le bouton **Envoyer les nouveautés en attente** permet de tester les mails de 06:00 immédiatement. Le lien **Ouvrir la boîte mail de test** ouvre `/__fleet/mail/`.

1. Dans deux profils de navigateur, choisir A et B sur cette page. Avec B, suivre le dossier et activer **Nouveautés sur mes dossiers suivis** dans **Mon espace > Paramètres**, puis enregistrer. Avec A, modifier un champ d'Instruction ou ajouter un commentaire dans `/dossier/ID?tab=instruction`. Faire plusieurs modifications du même dossier.
2. Ouvrir `/__fleet/accounts` et cliquer **Envoyer les nouveautés en attente**. La page confirme le nombre de mails envoyés dans la boîte locale. Ouvrir la boîte, vérifier un seul mail de nouveauté pour B et ce dossier, avec les liens du dossier et des paramètres. A ne reçoit rien pour sa propre action.
3. Cliquer à nouveau sans activité supplémentaire. Le message **Aucun mail de nouveauté à envoyer.** apparaît, aucun mail supplémentaire. Ajouter ensuite un nouveau commentaire avec A, puis recliquer. Un nouveau mail est possible pour ce nouveau lot, même avant le lendemain, sans renvoyer l'ancien.
4. Avec B, désactiver les nouveautés, quitter le suivi ou perdre l'accès au groupe avant l'envoi, séparément. Le bouton ne contourne aucun de ces contrôles. Les actions personnelles, les changements de suivi et la génération de documents seuls ne produisent aucun mail de nouveauté.
5. En cas d'échec, la page indique **L'envoi a échoué.** et le nombre éventuellement envoyé. Réessayer après une minute. Une boîte locale indisponible ne provoque jamais d'envoi externe de secours. Les cas d'erreur sont simulés dans les tests, sans interrompre la boîte de l'aperçu.

Le bouton traite jusqu'à 100 mails par clic, tous destinataires admissibles de cet aperçu confondus. Il conserve les reprises, les réservations concurrentes et les états de la file habituelle. Il avance seulement l'échéance des lots de nouveautés non tentés et libère leur clé de regroupement calendaire pour les modifications suivantes. Il ne rejoue pas les lignes envoyées, ne change pas l'horloge et ne touche pas aux attributions ou aux arrivées.

L'extension maintenue dans `apps/instructeur/preview/` est chargée par Vite en développement uniquement. Elle exige le contexte Fleet de ce checkout, son origine HTTPS, sa base isolée et un Mailpit sur `127.0.0.1`. Le déclenchement utilise POST avec contrôle d'origine et livraison directe vers Mailpit. Aucun endpoint n'est ajouté à l'application de production. L'outillage hôte et ses fichiers générés restent inchangés. La migration d'arrivée doit déjà être appliquée pour le reste des paramètres.

### Tests automatisés

Démarrer PostgreSQL de test, puis lancer les tests. Ils créent et suppriment uniquement la base `pitchou_test_notifications`, utilisent les migrations réelles et simulent Brevo. Le port par défaut est 5433. `TEST_DB_PORT` permet de choisir un autre port.

```sh
docker compose -f compose.test.yml up -d test_db
pnpm exec just test-email-notifications
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=unit
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=component src/routes/parametres src/routes/Layout/Header/CompactHeader.svelte.test.ts
```

La suite PostgreSQL vérifie les attributions réelles via l'endpoint, les valeurs inchangées sur Instruction, Avis, Contrôle, prescriptions, décisions et commentaires, les préférences, les exclusions, les baselines DN, le rollback, le regroupement, les changements d'heure, les reprises après erreur, les workers concurrents et l'absence de répétition après succès. Elle couvre aussi les arrivées natives, les membres du groupe sans suivi, les transferts, la conservation des anciens réglages à la migration, l'absence de rattrapage et les sauvegardes de groupe inchangées.

Inspecter les messages exigibles sans envoi ni modification de la file. La commande demande `DATABASE_URL` et `PUBLIC_SITE_URL_PITCHOU`, mais pas de clé Brevo.

```sh
pnpm --filter @pitchou/worker exec tsx send-dossier-notification-emails.ts --dry-run
```

Résultat observable, un objet JSON avec `dryRun: true` et `candidates`. Avant 06:00, les nouveautés programmées ne figurent pas dans cette liste. Les attributions et arrivées en attente y figurent immédiatement. Consulter aussi les états persistés.

```sh
psql "$DATABASE_URL" -c 'SELECT id, kind, dossier, personne, status, due_at, retry_at, first_attempt_at, sent_at, last_error FROM email_notification_outbox ORDER BY due_at;'
```

## Reprise et surveillance

Un succès passe le message à `sent`. Une préférence désactivée ou un accès révoqué entraîne `cancelled`. Quitter le suivi annule les attributions et nouveautés en attente, mais pas les arrivées dans le groupe. Un transfert annule les arrivées encore en attente pour l'ancien groupe. Une réponse explicite de rejet permet une reprise après une minute, y compris après une panne prolongée. Chaque tentative conserve le même corps et la même clé de déduplication.

Une réponse perdue peut masquer un envoi accepté. Les tentatives automatiques s'arrêtent après 25 minutes et passent le message à `uncertain`, avant l'expiration de 30 minutes documentée par [Brevo](https://developers.brevo.com/docs/heterogenous-versions-batch-emails). Un worker interrompu retrouve sa réservation après deux minutes. Vérifier les envois `uncertain` dans les journaux transactionnels Brevo, avec le destinataire, l'objet, la période de tentative et le tag `dossier-assignment`, `dossier-novelty` ou `dossier-arrival`. Confirmer l'envoi avant de marquer la ligne `sent`, ou confirmer son absence avant de remettre `status` à `pending`, `first_attempt_at` et `claimed_at` à `NULL`. Ne pas remettre toute la file en attente.

Les erreurs sont journalisées avec l'identifiant de l'envoi. Le worker retourne un code non nul si une tentative échoue. Il conserve les lignes envoyées pour empêcher un rattrapage involontaire lors d'une nouvelle exécution.
