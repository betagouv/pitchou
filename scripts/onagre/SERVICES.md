# Services Onagre et groupes Pitchou

L'onglet `Services et groupes` lit les services et régions du dump complet sélectionné. Il conserve les services historiques masqués ou fermés. Le classeur `services.xlsx` n'est pas nécessaire à son fonctionnement. Il contenait les mêmes 281 services et une liste de 29 anciens groupes, sans correspondances renseignées.

Chaque décision associe un identifiant `servicesid` à zéro, un ou plusieurs identifiants UUID de groupes Pitchou. Une validation exige au moins un groupe actif. Une exclusion exige une explication et aucun groupe. Les brouillons restent possibles. Ces décisions préparent l'affectation, le premier importeur expérimental ne les applique pas encore.

Les groupes viennent de `onagre_group_catalog`, une copie de référence des noms, identifiants, états et départements de `groupe_instructeurs` et `groupe_departement`. Cette copie ne crée aucun groupe opérationnel, membre ou droit d'accès dans la base de préparation. Elle conserve la provenance et la date de lecture. Le premier aperçu local utilise une lecture de Pitchou production du 25 octobre 2026, soit 30 groupes dont 27 actifs.

Le catalogue n'est pas synchronisé automatiquement. Avant un déploiement ou une nouvelle séance de validation, exporter les groupes actuels en lecture seule et actualiser la copie de référence avec `replaceGroupCatalog` dans une transaction. L'entrée attend `{source, refreshedAt, groups}`, avec pour chaque groupe `{id, name, active, coverage_needs_review, departments}`. Les groupes disparus restent visibles comme inactifs. Ne pas utiliser les UUID des groupes fictifs des seeds de développement.

Les décisions suivent `onagre-national/services/servicesid` indépendamment du dump. Une nouvelle version de la source ou un groupe cible inactif signale une décision à revoir. Un service absent du nouveau dump reste consultable avec son ancienne décision. La sauvegarde refuse les versions concurrentes, les sources modifiées et les catalogues périmés. Elle conserve une révision avec l'auteur et les groupes choisis. L'historique et l'export JSON incluent ces décisions. Le transfert de préparation copie également le catalogue, les décisions et leurs révisions.

## Vérification locale

Avec `ONAGRE_TRANSFER_TEST_ADMIN_URL` pointant explicitement vers un PostgreSQL local, lancer `node --import tsx scripts/onagre/verify-services.ts`. Le script crée et supprime ses propres bases de test. Il vérifie les écritures concurrentes, le retour arrière de la transaction si l'historique échoue, les changements de dump et de catalogue, les exclusions et l'absence de modification des dossiers ou des membres.

Pour l'aperçu, `just dev` utilise la base locale Onagre via une surcharge de `DATABASE_URL`. Après revue de l'interface, le propriétaire a autorisé le déplacement de `services.xlsx` dans la Corbeille de Polaris le 25 octobre 2026. L'onglet utilise le dump et le catalogue actuel des groupes, sans dépendre de ce classeur.
