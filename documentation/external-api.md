# API externe Pitchou

Le service instructeur publie le contrat OpenAPI sur `/api/v1/openapi.json` et Swagger UI sur `/api/v1/docs`. La version `v1` évolue par ajouts compatibles. Un changement incompatible introduit une nouvelle version et une période de migration annoncée aux partenaires.

La CI valide le contrat OpenAPI et bloque les changements incompatibles par rapport à la branche cible d’une pull request.

## Authentification des services

Les utilisateurs se connectent dans Pitchou avec ProConnect. Un service partenaire s’authentifie en son propre nom auprès d’un fournisseur OAuth 2.0 via `client_credentials`. Le partenaire conserve sa clé privée dans son gestionnaire de secrets et peut l’utiliser avec `private_key_jwt` si le fournisseur le prend en charge. Le fournisseur communique l’URL du serveur de jetons et les modalités d’enregistrement de la clé. Pitchou reçoit uniquement le jeton d’accès.

1. Enregistrer un client confidentiel distinct par service et par environnement. Réserver l’audience Pitchou à des clients `client_credentials`.
2. Configurer le fournisseur pour délivrer des JWT d’accès RFC 9068 signés en RS256 ou ES256, de type `at+jwt`, valables au plus 10 minutes. Pour ce profil de client, le fournisseur doit émettre le même identifiant dans `sub` et `client_id`, ainsi que `jti`, `iat`, `exp`, `iss`, `aud` et la portée autorisée dans `scope`.
3. Configurer `EXTERNAL_API_ISSUER`, `EXTERNAL_API_AUDIENCE` et `EXTERNAL_API_JWKS_URL` sur le service instructeur. Publier l’API en HTTPS et utiliser HTTPS pour le fournisseur et son jeu de clés publiques. Utiliser des audiences distinctes en production et en préproduction. Les clients et les habilitations sont propres à chaque base.
4. Le partenaire demande la portée `dossiers:read:statut`, puis transmet le jeton d’accès dans `Authorization: Bearer $PITCHOU_ACCESS_TOKEN`.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $PITCHOU_ACCESS_TOKEN" \
  "$PITCHOU_BASE_URL/api/v1/dossiers/123/statut"
```

Les appels interactifs dans Swagger UI sont disponibles si `EXTERNAL_API_SWAGGER_TRY_IT_OUT=true` et `PUBLIC_PITCHOU_ENV=staging`. Activer cette option sur un bac à sable à données synthétiques. Dans Swagger, saisir le jeton d’accès obtenu par le service, avec une durée de vie courte.

## Habiliter et révoquer un client

Pour le pilote, un opérateur configure les habilitations dans PostgreSQL après avoir vérifié l’identité du service, le responsable de l’intégration et les dossiers à partager. Insérer le `client_id` émis par le fournisseur. Les nouveaux clients sont désactivés par défaut.

```sql
BEGIN;
INSERT INTO external_api_client (client_id) VALUES ('service-partenaire');
INSERT INTO external_api_dossier_grant (client_id, scope, dossier)
VALUES ('service-partenaire', 'dossiers:read:statut', 123);
UPDATE external_api_client SET enabled = true WHERE client_id = 'service-partenaire';
COMMIT;
```

Pour accorder la portée sur tous les dossiers affectés à un groupe actif, insérer une habilitation dans `external_api_groupe_grant` avec son UUID `groupe_instructeurs`. Une affectation supprimée ou un groupe désactivé retire ce droit à la prochaine requête. Les habilitations directes et par groupe sont cumulatives.

Pour une révocation immédiate, exécuter `UPDATE external_api_client SET enabled = false WHERE client_id = 'service-partenaire'` et désactiver le client chez le fournisseur. Supprimer une ligne d’habilitation pour retirer uniquement le droit correspondant. Pitchou relit ces droits à chaque appel, y compris pour les jetons émis avant la révocation. Les démarrages de préproduction qui réinitialisent la base nécessitent de recréer les habilitations de test.

## Réponses et exploitation

Le statut correspond à la phase courante dans Pitchou. En l’absence d’événement enregistré, le statut est `accompagnement_amont` et la date est `null`.

- Un jeton absent, invalide ou associé à un client désactivé reçoit `401`. Un jeton sans la portée requise reçoit `403`.
- Un dossier inexistant ou hors habilitation reçoit la même réponse `404`.
- Le plafond de 60 requêtes par minute par client est partagé entre les instances. Un dépassement reçoit `429` et `Retry-After`.
- Les réponses de données et les erreurs associées portent `Cache-Control: no-store` et `X-Request-Id`. Chercher cet identifiant dans les journaux `external_api_request` pour retrouver le client, la route, le résultat et la durée de l’appel.
