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


### Pour pgadmin

Pour se connecter au serveur postgres dans un container: ce container doit être exposé au réseau et utiliser le `container_name` comme hostname 


## En prod

`npm start:production`


## Outils

### Migration base de données

`db-migrate up`


### Fabriquer la liste des espèces protégées

pour les autocomplete de saisie espèces notamment

`node outils/liste-espèces.js`


### Synchroniser dossiers récemment modifiés de Démarches Simplifiées

`node --env-file=.env outils/sync-démarches-simplifiées.js`
