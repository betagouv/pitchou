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

### Types

Pour régénérer tous les types :
`npm run build-types`

#### Regénérer les types des tables SQL

exécuter `npm run build-types:db`
Les types sont crées dans le dossier `./scripts/types/database/public`


#### Re-générer les types à partir du schema DS 88444

`npm run build-types:ds-88444`

Cette commande télécharge aussi la dernière version du schema avant de créer les types

Pour éviter le téléchargement et créer les types à partir du fichier schema existant dans le repo, ajouter l'option `--skipDownload`:
`node outils/genere-types-88444.js --skipDownload`


### Pour pgadmin

Pour se connecter au serveur postgres depuis un container : ce container doit être exposé au réseau et utiliser `postgres_db` (le `container_name` de la base de donnée Postgres) comme hostname 

URL pour pgadmin en dev : 
`http://localhost:5050/`


## En prod

`npm start:production`

L'application est déployée sur Scalingo

Nous utilisons [l'outil ligne de commande de Scalingo](https://doc.scalingo.com/platform/cli/start)

### Base de données

On utilise une base de données Postgres 15.7 en prod


#### Backups

Scalingo fournit des backups
https://doc.scalingo.com/databases/postgresql/backing-up

Actuellement, on a un backup quotidien des 7 derniers jours, un backup hebdomadaire des 4 dernières semaines et 10 backups manuels


##### Restorer un backup en local

**Récupérer le dernier backup**

```sh
cd backups

# Télécharger le dernier backup
scalingo --app especes-protegees --addon postgresql backups-download

# Dézipper le fichier .pgsql
tar -xf <nom_fichier>.tar.gz
# ignorer le message qui dit "tar: Suppression de « / » au début des noms des membres"

ll # afficher le nom du fichier .pgsql
cd -
```

**Restore le dernier backup**

```sh
# Supprimer la base de données existante
docker exec postgres_db dropdb -f --username=dev especes_pro_3731

# Recréer la base de données 
docker exec postgres_db createdb --username=dev especes_pro_3731

# Restore des données
docker exec postgres_db pg_restore --no-owner --no-privileges --dbname=especes_pro_3731 --username=dev --jobs=6 /var/lib/pitchou/backups/<nom du fichier>.pgsql
```


##### Restorer un backup en prod

On peut faire un restore en un clic d'un backup dans l'onglet `BACKUPS` du dashboard de l'addon PostgreSQL

Sinon, on peut suivre la [procédure de la documentation Scalingo](https://doc.scalingo.com/databases/postgresql/restoring)



## Outils

### Migration base de données

`knex migrate:latest` (fait automatiquement à chaque déploiement, voir package.json `scripts.prestart:prod-server`)

Pour aller en arrière et en avant d'un cran dans la liste des migrations : 
`npm run migrate:down`
`npm run migrate:up`


### Fabriquer la liste des espèces protégées

pour les autocomplete de saisie espèces notamment

`node outils/liste-espèces.js`


### Ajouter une espèce manquante

Dans le fichier `data/sources_especes/espèces_manquantes.csv` ajouter l'espèce avec son identifiant INPN (CD_NOM),nom latin (LB_NOM), nom vernaculaire (NOM_VERN) et sa justification légale (LABEL_STATUT).

Puis lancer `node outils/liste-espèces.js` pour régénérer une liste d'espèces complétée.


### Synchroniser dossiers récemment modifiés de Démarches Simplifiées

#### En dev

depuis le container du serveur

`docker exec tooling node --env-file=.env outils/sync-démarches-simplifiées-88444.js` (dernières heures par défaut)

`docker exec tooling node --env-file=.env outils/sync-démarches-simplifiées-88444.js --lastModified 2025-06-01`(synchroniser les dossiers modifiés depuis le 1 juin 2025)


`docker exec tooling node --env-file=.env outils/sync-démarches-simplifiées-88444.js --lastModified 2024-01-01` (synchroniser tous les dossiers, date très distantes)


#### En prod

##### Synchronisation régulière

Un [crontab](cron.json) tourne régulièrement pour récupérer les dossiers récemment modifiés dans DS et les synchroniser en base de données

Pour modifier le cron : https://crontab.guru/


##### Synchronisation complète ponctuelle

Parfois, notamment après des changements dans le modèle de données, il est nécessaire de synchroniser tous les dossiers

Pour le faire, on peut utiliser un [*one-off container*}(https://doc.scalingo.com/platform/app/tasks) :

```sh
scalingo --app especes-protegees run node outils/sync-démarches-simplifiées-88444.js --lastModified 2024-01-01
```


### Fabriquer le JSON de la liste des groupes d'espèces

`node outils/groupes-espèces.js`

### Remplir des annotations privées

`node --env-file=.env outils/remplir-annotations.js`


### Lister les liens de connexion en local

Utile pour tester rapidement en local après un restore de backup en tant qu'une personne en particulier

`docker exec tooling node outils/afficher-liens-de-connexion.js --emails adresse1@e.mail,adresse2@e.mail`

Pour les lien de connexion en production : 

`docker exec tooling node outils/afficher-liens-de-connexion.js --emails adresse1@e.mail,adresse2@e.mail --prod`

Pour donner l'origine de manière libre :

`docker exec tooling node outils/afficher-liens-de-connexion.js --emails adresse1@e.mail,adresse2@e.mail --origin 'http://test.lol'`

