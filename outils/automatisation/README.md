# Outils d'automatisation

Ce dossier contient les scripts d'automatisation.

## Import de dossiers

Script pour automatiser l'import de dossiers dans Pitchou.

### Utilisation

```bash
node outils/automatisation/import-dossiers.js --fichier /chemin/vers/fichier.ods
```

### Options

- `--fichier, -f` : Chemin vers le fichier tableau de suivi (.ods) - **requis**
- `--email, -e` : Email utilisé pour récupérer le lien de connexion (défaut : `clemence.fernandez@beta.gouv.fr`)

### Comportement

- URL fixe : `http://127.0.0.1:2648`
- Secret récupéré automatiquement via  
  `docker exec tooling node outils/afficher-liens-de-connexion.js --emails <email>`
- Lancement du navigateur Firefox fourni par Playwright (équivalent Nightly)

### Exemple

```bash
node outils/automatisation/import-dossiers.js \
  --fichier /Users/clemencefernandez/Desktop/pitchou_pas_code/import_corse/24-2B_TDB_DOSSIERS_DEP.ods \
  --email clemence.fernandez@beta.gouv.fr
```