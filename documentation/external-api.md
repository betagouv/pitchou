# API externe Pitchou

Le service instructeur publie le contrat OpenAPI sur `/api/v1/openapi.json` et Swagger UI sur `/api/v1/docs`. La CI valide le contrat et vérifie sa compatibilité avec la branche cible d’une pull request et avec la révision de base de la file de fusion. Un changement incompatible introduit une nouvelle version et une période de migration annoncée aux partenaires.

## Clés personnelles

Connectez-vous avec ProConnect puis ouvrez **Paramètres → API** (`/parametres/api`). Donnez un nom à la clé, choisissez ses permissions et sa durée de validité, puis copiez le jeton. Pitchou affiche le jeton une seule fois et conserve son empreinte. Cette page permet de voir la dernière utilisation et de révoquer une clé.

Chaque appel applique les permissions de la clé et les droits actuels du compte. Le retrait de droits ou la désactivation du compte prend effet pour les appels suivants. Un compte sans droit de consulter les dossiers peut créer une clé pour son compte et les référentiels.

## Clés de service

Dans l’application admin, ouvrez **Intégrations API** (`/integrations-api`). Cette page exige `admin:access` et `admin:api:manage`. Ajoutez un service par intégration partenaire. Accordez-lui une permission sur un dossier par son numéro Pitchou, ou sur les dossiers affectés à un groupe instructeur actif. Un service nouvellement créé doit recevoir une habilitation pour consulter des dossiers.

Créez ensuite une clé pour ce service avec les permissions convenues. Transmettez le jeton par un canal privé et envoyez l’URL de l’API au partenaire. Plusieurs clés peuvent coexister pendant un renouvellement. Révoquer une clé retire son accès. Désactiver le service bloque toutes ses clés et ses autres identifiants. Les clés de service appartiennent à l’intégration. Les changements effectués par les administrateurs sont enregistrés dans le journal d’administration.

Au premier déploiement, l’application instructeur applique la migration API à la base partagée. Les deux applications se déploient automatiquement sur Scalingo. La page **Intégrations API** renvoie temporairement une réponse `503` si l’administration démarre avant l’application de la migration.

## Permissions et ressources

| Permission               | Ressources accessibles                                                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dossiers:read`          | Liste, fiche et ressources du dossier. Une clé personnelle suit le niveau d’accès de son titulaire. Une clé de service nécessite une habilitation et dispose de la lecture restreinte par défaut.                      |
| `dossiers:read:internal` | Accès interne pour une intégration disposant aussi de `dossiers:read`. Les deux permissions doivent être présentes sur la clé et chacune doit être accordée sur le dossier ou l’un de ses groupes instructeurs actifs. |
| `account:read`           | Compte, clés personnelles, groupes et membres, notifications, préférences et recherches récentes du titulaire. Cette permission est réservée aux clés personnelles.                                                    |
| `references:read`        | Activités, TAXREF, BDC-Statuts, espèces protégées, types d’impact, méthodes, moyens de poursuite, statistiques publiques et nouveautés. Cette permission ne requiert pas d’habilitation par dossier.                   |

Les chemins ci-dessous sont relatifs à `/api/v1`. Toutes ces opérations sont en lecture seule.

- `GET /dossiers` liste les dossiers par identifiant croissant. Utilisez `limit` (50 par défaut, 100 au maximum) et transmettez la valeur de `next_cursor` dans le paramètre `after` pour lire la suite. Vous pouvez filtrer par `status`, `department` principal, `q` (nom ou identifiant) et, avec une clé personnelle, `followed`.
- Avec une clé personnelle, la liste inclut le niveau d’accès, les lieux, l’activité, les références des espèces impactées et les prochaines échéances. Le dernier commentaire est disponible avec un accès interne au dossier.
- `GET /dossiers/{id}` renvoie la fiche du projet et son état d’instruction. Les sous-ressources `avis-experts`, `decisions`, `especes-impactees`, `phase-events`, `followers` et `pieces-jointes` appliquent le niveau de lecture du dossier.
- Les prescriptions, contrôles, commentaires, événements de l’historique et envois CNPN sont accessibles via `prescriptions`, `controles`, `comments`, `history` et `cnpn-emails` avec un accès interne. Les avis non officiels, les saisines et les pièces internes demandent le même niveau d’accès.
- `GET /dossiers/{id}/follower-candidates` liste les personnes que le titulaire d’une clé personnelle peut ajouter au suivi d’un dossier qu’il peut instruire.
- La liste des pièces fournit une URL de téléchargement par fichier. Utilisez le même en-tête `Authorization` pour le téléchargement. Le dossier de l’URL détermine l’accès à la pièce, y compris lorsque le fichier est partagé entre plusieurs dossiers.
- `GET /account` identifie le titulaire. Ses données personnelles sont accessibles sous `/account/groupes`, `/account/notifications`, `/account/notification-preferences` et `/account/recent-searches`.
- `GET /account/api-keys` renvoie les métadonnées des clés personnelles du titulaire. `GET /account/groupes/{groupId}/member-candidates?q=…` permet de rechercher des membres à ajouter à un groupe actif dont le titulaire fait partie.
- Les nouveautés publiées sont disponibles sous `/references/changelog`. `/references/synchronization-status` fournit la date de la dernière synchronisation réussie avec Démarches Numériques.
- Les chemins sous `/references` et les paramètres de recherche sont documentés dans Swagger.

Les dates sans heure, comme une signature ou une échéance, sont renvoyées sous la forme `YYYY-MM-DD`. Les horodatages sont en UTC.

## Appeler l’API

Sur `just dev`, ouvrez `/api/v1/docs`, cliquez sur **Authorize** et collez le jeton brut, puis utilisez **Try it out**. En préproduction, les appels interactifs sont disponibles avec `EXTERNAL_API_SWAGGER_TRY_IT_OUT=true` et `PUBLIC_PITCHOU_ENV=staging`. Publiez l’API en HTTPS.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $PITCHOU_ACCESS_TOKEN" \
  "$PITCHOU_BASE_URL/api/v1/dossiers?limit=20&department=75&status=instruction"
```

La liste et la fiche de dossier renvoient `status` et `status_changed_at`. En l’absence d’événement de phase enregistré, le statut est `accompagnement_amont` et la date est `null`. Une ancienne clé dédiée au statut doit être remplacée par une clé portant la permission `dossiers:read` pour accéder à ces ressources.

- Un jeton absent, invalide ou associé à un compte ou service désactivé reçoit `401`. Un jeton sans la permission requise reçoit `403`.
- Un dossier inexistant ou hors habilitation reçoit la même réponse `404`.
- La limite est de 60 requêtes par minute par clé personnelle et par service. Un dépassement reçoit `429` et `Retry-After`.
- Les réponses de données et les erreurs associées portent `Cache-Control: no-store` et `X-Request-Id`. Le journal `external_api_request` contient le compte ou le service correspondant et l’identifiant de clé quand il est disponible.

## Intégrations qui utilisent OAuth

Une intégration configurée pour OAuth peut demander un jeton via `client_credentials` au fournisseur indiqué lors de son habilitation. Les services existants conservent leur accès OAuth. Les services créés depuis l’administration utilisent des clés de service.

Pour configurer un client OAuth, enregistrer son `client_id` dans `external_api_client` avec `allow_oauth = true`. Les habilitations de ce client se gèrent dans **Intégrations API**. Configurer `EXTERNAL_API_ISSUER`, `EXTERNAL_API_AUDIENCE` et `EXTERNAL_API_JWKS_URL` sur le service instructeur. Réserver l’audience Pitchou aux clients `client_credentials` et utiliser des audiences distinctes par environnement. Le fournisseur doit émettre un JWT `at+jwt` signé en RS256 ou ES256, valide au plus dix minutes, avec le même identifiant dans `sub` et `client_id`.
