# Pitchou

Mieux contrôler les dérogations d'espèces protégées


## Installer

Installer [docker](https://docs.docker.com/engine/) et [docker-compose](https://docs.docker.com/compose/)
Peut-être via [Docker Desktop](https://docs.docker.com/desktop/), bonne chance !


## Architecture

Front-end en Svelte
Back-end en Node.js
Base de données Postgres

Le serveur récupère les données des dossiers via [l'API Démarches Simplifiées](https://doc.demarches-simplifiees.fr/api-graphql). Il en fait une sauvegarde régulière, parce que Démarches Simplfiées ne sauvegarde les données que temporairement (1 an pour le moment, nous allons demander 5 ans)




## En dév

En dev, on peut lancer `npm run dev` pour lancer le tout.\
Le repo est synchroniser dans le conteneur du serveur via un volume.\
Les données de la base de données sont sauvegarder dans un volume dans le repo (pour faire des test facilement)

http://localhost:2648/
http://localhost:2648/saisie-especes

### Créer une migration

exécuter `knex migrate:make <nom de la migration>`
modifier les fonction `up()` `down()` du fichier `./migrations/XXX-nom.js`

[documentation sur les migrations knex](https://knexjs.org/guide/migrations.html)

#### Regénérer les types jsdoc des tables SQL

exécuter `npm run build-db-types`
Les types sont crées dans le dossier `./scripts/types/database/public`
Dans le fichier .js du type supprimer l'export ligne 3 `export {};`


### Pour pgadmin

Pour se connecter au serveur postgres depuis un container : ce container doit être exposé au réseau et utiliser le `container_name` comme hostname 

URL pour pgadmin en dev : 
`http://localhost:5050/`


## En prod

`npm start:production`


## Outils

### Migration base de données

`knex migrate:latest` (fait automatiquement à chaque déploiement, voir package.json `scripts.prestart:prod-server`)

Pour revenir en arrière sur une migration : `knex migrate:down --env docker_dev`

### Fabriquer la liste des espèces protégées

pour les autocomplete de saisie espèces notamment

`node outils/liste-espèces.js`

### Ajouter une espèce manquante
Dans le fichier `data/sources_especes/espèces_manquantes.csv` ajouter l'espèce avec son identifiant INPN (CD_NOM),nom latin (LB_NOM), nom vernaculaire (NOM_VERN) et sa justification légale (LABEL_STATUT).

Puis lancer `node outils/liste-espèces.js` pour régénérer une liste d'espèces complétée.

### Synchroniser dossiers récemment modifiés de Démarches Simplifiées

En dev, depuis le container du serveur

`docker exec node_server node --env-file=.env outils/sync-démarches-simplifiées-88444.js` (dernières heures par défaut)

`docker exec node_server node --env-file=.env outils/sync-démarches-simplifiées-88444.js --lastModified 2024-07-25` (synchroniser les dossiers modifiés depuis le 25 juillet 2024)


`docker exec node_server node --env-file=.env outils/sync-démarches-simplifiées-88444.js --lastModified 2024-01-01` (synchroniser tous les dossiers, date très distantes)

#### En prod

Pour modifier le cron : https://crontab.guru/

### Fabriquer le JSON de la liste des groupes d'espèces

`node outils/groupes-espèces.js`

### Remplir des annotations privées

`node --env-file=.env outils/remplir-annotations.js`