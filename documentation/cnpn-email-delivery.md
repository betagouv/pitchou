# Suivi des mails CNPN

Pitchou distingue la prise en charge du mail par Brevo de sa distribution au destinataire
principal. Une réponse positive de l'API d'envoi ne confirme pas la distribution.
L'onglet Avis présente le dernier mail CNPN du dossier, même si les documents ont été
transmis par lien plutôt qu'en pièces jointes. Les envois précédents restent dans l'historique.

## Événements Brevo

Le webhook transactionnel doit envoyer les événements `delivered`, `opened`, `unique_opened`,
`soft_bounce`, `hard_bounce`, `blocked`, `invalid_email` et `error` à
`/api/webhooks/brevo` sur l'application instructeur de l'environnement concerné.
Configurer son authentification Bearer avec `BREVO_WEBHOOK_SECRET`. Ne pas placer le secret
dans l'URL. Conserver les tags d'environnement et le champ `X-Mailin-custom`.

Les événements de rejet concernent le destinataire principal, pas les copies. Pitchou
enregistre le dernier rejet et son motif, affiche l'échec dans l'administration et le dossier,
et avertit l'instructeur qui a envoyé le mail. Les répétitions du webhook partagent une
notification et une clé d'idempotence. Une distribution ou une ouverture confirmée ensuite
rétablit l'état distribué, tout en conservant le rejet dans l'historique. Les échecs de
notification demandent une nouvelle tentative du webhook.

Les échecs de livraison de tous les mails Pitchou, y compris les notifications et les mails
de connexion, déclenchent aussi une alerte à `tech@pitchou.beta.gouv.fr`. Les erreurs de
l'API d'envoi déclenchent la même alerte, avec une catégorie d'erreur. L'alerte contient le
destinataire, l'objet, le motif, la date, l'environnement et l'identifiant Brevo si disponible.
Elle ne contient pas le corps du mail ou les liens de connexion.

La table `email_issue_notification` conserve les alertes et déduplique les événements pour
un même message et destinataire. Le worker des notifications reprend les alertes non envoyées.
Si un envoi reste ambigu pendant 25 minutes, Pitchou arrête les reprises automatiques avant
la fin de la fenêtre de déduplication de Brevo. `uncertain_at` signale une alerte technique à
rapprocher des journaux Brevo. `failure_notification_uncertain_at` remplit le même rôle pour
l'alerte destinée à l'instructeur et apparaît dans l'historique d'administration. Un refus
explicite du fournisseur permet une reprise ultérieure tant qu'aucune tentative antérieure
n'est restée ambiguë.
Les échecs d'une alerte technique ne créent pas d'autres alertes. Une panne de Brevo peut
retarder l'alerte jusqu'au rétablissement du service. Une panne de base empêche sa persistance.
En préproduction, ajouter explicitement `tech@pitchou.beta.gouv.fr` à
`STAGING_EMAIL_ALLOWLIST` pour recevoir ces alertes. Les blocages intentionnels par cette
liste et les erreurs de validation avant envoi ne déclenchent pas d'alerte technique.

La migration ajoute des champs sans reconstituer les événements passés. Déployer le code
et la migration, vérifier les abonnements du webhook dans Brevo, puis rejouer les événements
manquants avec leur identifiant de message et leur date d'origine. Leurs motifs et dates
doivent provenir des journaux Brevo. Le rejeu d'un échec non résolu avertit l'expéditeur.

## Rejet pour taille excessive

Le journal du 23 octobre 2026, dossier Cernay, indique
`552 5.3.4 Error: message file too big` pour le message
`<202610231235.47230176388@smtp-relay.mailin.fr>`.
Le serveur SMTP refuse la taille du message. Le journal fourni ne donne ni sa limite exacte,
ni la taille du message transmis.

Brevo accepte au maximum 20 Mo pour l'ensemble du mail. Pitchou impose une limite de
10 Mo pour le mail CNPN complet après encodage. Pitchou estime la taille MIME,
y compris l'encodage base64 des pièces jointes, qui augmente leur taille d'environ un tiers.
La limite du serveur destinataire peut être inférieure. Le contrôle avant envoi ne garantit
donc pas la distribution. Le serveur contrôle les octets réels, même si la taille enregistrée
en base est incorrecte. Le sélecteur avertit aussi lorsque les pièces jointes dépassent déjà
la limite après encodage. Un refus de taille laisse le brouillon modifiable et affiche un lien
vers [France Transfert](https://francetransfert.numerique.gouv.fr/upload).

Pour ce dossier, réduire les pièces jointes ou les déposer sur un service de transfert
autorisé. Ajouter le lien de téléchargement au corps du mail et retirer les pièces ainsi
remplacées. Vérifier que le CNPN peut ouvrir le lien sans compte Pitchou, puis effectuer un
nouvel envoi et contrôler la confirmation de distribution. Renvoyer le même message dans
Brevo ne réduit pas sa taille. Les liens internes de téléchargement Pitchou nécessitent un
accès au dossier et ne conviennent pas à ce contournement.

## Protection des tests et des données de démonstration

Les adresses `member@test.fr`, `member-one@test.fr` et `member-two@test.fr` appartiennent aux
tests HTTP et navigateur. Leurs serveurs exécutent les builds avec `NODE_ENV=production`.
Leur ancienne configuration héritait de `BREVO_API_KEY`, ce qui permettait des envois réels
si le shell contenait une clé valide. La capture du 26 octobre 2026 correspond à ces adresses
et aux objets produits par les tests d'attribution. Cela indique une fuite des tests, sans
prouver à lui seul quel processus les a exécutés.

Les deux setups effacent désormais la clé et `MAILPIT_URL`, puis imposent
`PITCHOU_EMAIL_DELIVERY_DISABLED=true`. Ce blocage agit avant tout appel réseau de la couche
d'envoi. Les tests qui vérifient le contenu des messages utilisent des envois simulés.
La liste d'autorisation de préproduction et la suppression des notifications lors des seeds
restent des protections distinctes.

## Ouverture et lecture

Brevo mesure le chargement d'une image de suivi, pas la lecture humaine. Le logiciel de
messagerie peut bloquer les images et les réglages Brevo peuvent limiter le suivi. Sans
événement d'ouverture dans Brevo, Pitchou ne peut pas retrouver une date de lecture.
L'interface indique donc une lecture inconnue ou une absence de détection.

Pour les exemples du 23 septembre, le journal fourni indique seulement l'envoi et la
distribution. Si une preuve de prise de connaissance est nécessaire, demander une réponse
explicite au destinataire. Un événement d'ouverture ne garantit pas la lecture complète.

Sources : [événements transactionnels Brevo](https://developers.brevo.com/docs/transactional-webhooks),
[limites des pièces jointes](https://help.brevo.com/hc/en-us/articles/4402811730962-Add-an-attachment-to-a-transactional-email),
[suivi par pixel](https://help.brevo.com/hc/en-us/articles/37114679474706-About-email-tracking-pixels-and-the-CNIL-recommendation-in-Brevo).
