# Objets Onagre et activités Pitchou

L'onglet `Objets et activités` présente les décisions de la section `objet`, hors descriptions de colonnes. Il utilise les mêmes lignes `onagre_mapping`, le même éditeur et la même action de sauvegarde que `Correspondances`. Une modification de statut, activité, règle ou notes apparaît dans les deux vues au chargement suivant. Les versions concurrentes restent refusées.

Le choix d'activité est conservé dans `onagre_mapping.activity_code`. Une valeur `null` indique une ancienne décision sans choix structuré. Une chaîne vide indique que l'utilisateur a explicitement retiré son choix, sans nouvelle suggestion au prochain chargement. Les codes sont contrôlés contre le référentiel `activite` de cette base à chaque sauvegarde. Une activité retirée du référentiel reste dans l'historique, mais ne peut pas être enregistrée à nouveau. Les anciennes règles peuvent proposer un code reconnu, affiché comme suggestion à confirmer. Choisir une autre activité actualise le début d'une règle générée, sans supprimer ses conditions complémentaires.

Le contexte provient des 59 lignes conservées dans `onagre_document_row` pour `Correspondance_Nom_projet_Objet_projet.ods`, empreinte `19518931227c63fc6b6726f135344800562b2df9f9fc33518a9ea4ad70fc5063`. Les libellés du suivi, objets du classeur, propositions DS et notes restent visibles dans l'éditeur des deux onglets. La note générale du classeur est également conservée. Le fichier original est déjà archivé dans `onagre_document`.

Les rapprochements utilisent le libellé de l'objet. Pour l'énergie renouvelable, la proposition précise le sous-type. Les propositions concurrentes restent distinctes, y compris les deux lignes photovoltaïques du classeur principal. Quatre lignes du classeur complémentaire n'identifient pas un objet du dump : Protection risques naturels, Police, Autre et la ligne sans objet proposant Dommages aux biens et activités. Elles ont des décisions séparées, explicitement marquées sans identifiant Onagre. Leur clé contient l'empreinte du document et le numéro de ligne, jamais un identifiant Onagre inventé.

## Préparation et vérification

Après la migration `20261102120000_onagre-activity-choice.ts` et le chargement des documents, lancer `node --import tsx scripts/onagre/prepare-activities.ts` sur une base locale pour voir les décisions complémentaires à créer. Ajouter `--apply` pour les créer. Le script conserve les décisions existantes et un second passage n'ajoute rien. Pour une base partagée, transférer les données de préparation avec le processus déjà prévu. Le transfert inclut le choix d'activité, les décisions et les documents.

Avec `ONAGRE_TRANSFER_TEST_ADMIN_URL` configuré sur un PostgreSQL local, `node --import tsx scripts/onagre/verify-activities.ts` crée ses propres bases jetables. Il vérifie les rapprochements, les propositions concurrentes, les révisions partagées, les conflits, les activités retirées, le retrait explicite d'un choix et le retour arrière si l'historique échoue.

Ces décisions ne sont pas encore exécutées par l'importeur expérimental. Aucun dossier ni référentiel d'activités n'est modifié par cet espace. Après la revue locale et l'accord du propriétaire, le fichier ODS sur Polaris a été déplacé dans la Corbeille le 25 octobre 2026. Les données et l'original archivés dans la base restent conservés.
