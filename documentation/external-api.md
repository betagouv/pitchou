# API externe Pitchou

Le service instructeur publie le contrat OpenAPI sur `/api/v1/openapi.json` et Swagger UI sur `/api/v1/docs`. La CI valide le contrat et bloque les changements incompatibles par rapport à la branche cible d’une pull request. Un changement incompatible introduit une nouvelle version et une période de migration annoncée aux partenaires.

## Clés personnelles

Connectez-vous avec ProConnect puis ouvrez **Paramètres → API** (`/parametres/api`). Donnez un nom à la clé, choisissez ses permissions et sa durée de validité, puis copiez le jeton. Pitchou affiche le jeton une seule fois et conserve son empreinte. Cette page permet de voir la dernière utilisation et de révoquer une clé.

Chaque appel applique les permissions de la clé et les droits actuels du compte. Le retrait de droits ou la désactivation du compte prend effet pour les appels suivants. La première opération disponible est `dossiers:read:statut`.

## Clés de service

Dans l’application admin, ouvrez **Intégrations API** (`/integrations-api`). Cette page exige `admin:access` et `admin:api:manage`. Ajoutez un service par intégration partenaire. Accordez-lui une permission sur un dossier par son numéro Pitchou, ou sur les dossiers affectés à un groupe instructeur actif. Un service nouvellement créé doit recevoir une habilitation pour consulter des dossiers.

Créez ensuite une clé pour ce service avec les permissions convenues. Transmettez le jeton par un canal privé et envoyez l’URL de l’API au partenaire. Plusieurs clés peuvent coexister pendant un renouvellement. Révoquer une clé retire son accès. Désactiver le service bloque toutes ses clés et ses autres identifiants. Les clés de service appartiennent à l’intégration. Les changements effectués par les administrateurs sont enregistrés dans le journal d’administration.

## Appeler l’API

Sur `just dev`, ouvrez `/api/v1/docs`, cliquez sur **Authorize** et collez le jeton brut, puis utilisez **Try it out**. En préproduction, les appels interactifs sont disponibles avec `EXTERNAL_API_SWAGGER_TRY_IT_OUT=true` et `PUBLIC_PITCHOU_ENV=staging`. Publiez l’API en HTTPS.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $PITCHOU_ACCESS_TOKEN" \
  "$PITCHOU_BASE_URL/api/v1/dossiers/123/statut"
```

Le statut correspond à la phase courante dans Pitchou. En l’absence d’événement enregistré, le statut est `accompagnement_amont` et la date est `null`.

- Un jeton absent, invalide ou associé à un compte ou service désactivé reçoit `401`. Un jeton sans la permission requise reçoit `403`.
- Un dossier inexistant ou hors habilitation reçoit la même réponse `404`.
- La limite est de 60 requêtes par minute par clé personnelle et par service. Un dépassement reçoit `429` et `Retry-After`.
- Les réponses de données et les erreurs associées portent `Cache-Control: no-store` et `X-Request-Id`. Le journal `external_api_request` contient le compte ou le service correspondant et l’identifiant de clé quand il est disponible.

## Intégrations qui utilisent OAuth

Une intégration configurée pour OAuth peut demander un jeton via `client_credentials` au fournisseur indiqué lors de son habilitation. Les services existants conservent leur accès OAuth. Les services créés depuis l’administration utilisent des clés de service.

Pour configurer un client OAuth, enregistrer son `client_id` dans `external_api_client` avec `allow_oauth = true`. Les habilitations de ce client se gèrent dans **Intégrations API**. Configurer `EXTERNAL_API_ISSUER`, `EXTERNAL_API_AUDIENCE` et `EXTERNAL_API_JWKS_URL` sur le service instructeur. Réserver l’audience Pitchou aux clients `client_credentials` et utiliser des audiences distinctes par environnement. Le fournisseur doit émettre un JWT `at+jwt` signé en RS256 ou ES256, valide au plus dix minutes, avec le même identifiant dans `sub` et `client_id`.
