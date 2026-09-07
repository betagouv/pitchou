# Évènements suivis

## Qu'est-ce qu'un évènement ?

Quand un utilisateur réalise certaines actions dans Pitchou, l'application enregistre silencieusement un **évènement** en base de données.

Un évènement correspond à une action précise : un clic sur un bouton, une modification dans un formulaire, le chargement d'une page. Tous les évènements sont listés ci-dessous.

---

## Les évènements

### Connexion

#### `seConnecter`

- **Ce que ça représente :** Une connexion à Pitchou
- **Page :** N'importe quelle page
- **Action :** Automatique - se déclenche quand l'utilisateur charge une page Pitchou et possède un lien d'accès valide

---

### Consultation

#### `rechercherDesDossiers`

- **Ce que ça représente :** Utiliser les filtres ou la recherche dans la liste des dossiers
- **Page :** "Tous les dossiers", "Mes dossiers", "Tableau de suivi"
- **Action :** Utiliser un filtre pour chercher un dossier (par exemple, en utilisant le champ texte, en filtrant par instructeur.ices, par activité principale, par espèce protégée impactée...)
- **Note :** Le champ texte cherche aussi dans les noms des espèces impactées, vernaculaires comme scientifiques

#### `afficherLesDossiersSuivis`

- **Ce que ça représente :** Filtrer pour n'afficher que les dossiers que l'utilisateur.ice connecté.e suit.
- **Page :** "Mes dossiers", "Tableau de suivi"

#### `consulterUnDossier`

- **Ce que ça représente :** Accéder à l'onglet Projet d'un dossier
- **Note :** Déclenché au plus une fois toutes les 15 minutes pour le même dossier

#### `téléchargerListeÉspècesImpactées`

- **Ce que ça représente :** Télécharger le fichier des espèces impactées d'un dossier
- **Page :** Page d'un dossier, onglet **"Projet"**

#### `téléchargerCartographieProjet`

- **Ce que ça représente :** Télécharger la cartographie du projet d'un dossier
- **Page :** Page d'un dossier, onglet **"Projet"**

#### `clickNavbarLink`

- **Ce que ça représente :** Cliquer sur un lien de la barre de navigation principale
- **Page :** N'importe quelle page
- **Note :** Enregistre quel lien a été suivi ("Mes dossiers", "Tous les dossiers", "Tableau de suivi", "Saisie espèces", "Préremplissage dérogation", "Aide Pitchou")

---

### Modification

#### `suivreUnDossier`

- **Ce que ça représente :** Mettre un dossier en suivi (par moi)
- **Page :** "Tous les dossiers", "Mes dossiers", "Tableau de suivi"

#### `assignDossierFollowers`

- **Ce que ça représente :** Modifier la liste des instructeur.ices qui suivent un dossier (en ajouter, en retirer)
- **Page :** "Tous les dossiers", "Mes dossiers", "Tableau de suivi", page d'un dossier

#### `modifierCommentaireInstruction`

- **Ce que ça représente :** Rédiger ou modifier le commentaire d'instruction d'un dossier
- **Page :** Toutes les pages où l'on peut modifier le commentaire d'un dossier

#### `changerPhase`

- **Ce que ça représente :** Changer la phase d'un dossier
- **Page :** Toutes les pages où l'on peut modifier la phase d'un dossier

#### `changerProchaineActionAttendueDe`

- **Ce que ça représente :** Modifier qui est responsable de la prochaine action sur le dossier
- **Page :** Toutes les pages où l'on peut modifier la "Prochaine action attendue de" d'un dossier

#### `ajouterDécisionAdministrative`

- **Ce que ça représente :** Ajouter une décision administrative à un dossier
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `modifierDécisionAdministrative`

- **Ce que ça représente :** Modifier une décision administrative existante
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `supprimerDécisionAdministrative`

- **Ce que ça représente :** Supprimer une décision administrative
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `ajouterPrescription`

- **Ce que ça représente :** Ajouter une prescription à une décision administrative
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `modifierPrescription`

- **Ce que ça représente :** Modifier le contenu d'une prescription
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `supprimerPrescription`

- **Ce que ça représente :** Supprimer une prescription
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `ajouterContrôle`

- **Ce que ça représente :** Ajouter un contrôle de conformité sur une prescription
- **Page :** Page d'un dossier → onglet **"Contrôles"** → section d'une prescription

#### `modifierContrôle`

- **Ce que ça représente :** Modifier un contrôle existant
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `supprimerContrôle`

- **Ce que ça représente :** Supprimer un contrôle
- **Page :** Page d'un dossier, onglet **"Contrôles"**

#### `ajouterAvisExpert`

- **Ce que ça représente :** Ajouter un avis expert ou une saisine
- **Page :** Page d'un dossier, onglet **"Avis"**

#### `modifierAvisExpert`

- **Ce que ça représente :** Modifier un avis expert existant
- **Page :** Page d'un dossier, onglet **"Avis"**

#### `supprimerAvisExpert`

- **Ce que ça représente :** Supprimer un avis expert
- **Page :** Page d'un dossier, onglet **"Avis"**

#### `ouvrirModaleAjouterPieceJointe`

- **Ce que ça représente :** Ouvrir la modale d'ajout d'une pièce jointe
- **Page :** Page d'un dossier, depuis l'entête ou les onglets **"Pièces jointes"**, **"Avis"**, **"Contrôles"** et **"Instruction"**
- **Note :** Enregistre d'où la modale a été ouverte, pour la comparer aux ajouts effectivement menés à bout

#### `ajouterPieceJointe`

- **Ce que ça représente :** Ajouter une ou plusieurs pièces jointes depuis la modale
- **Page :** Page d'un dossier, depuis l'entête ou les onglets **"Pièces jointes"**, **"Avis"**, **"Contrôles"** et **"Instruction"**
- **Note :** Enregistre d'où la modale a été ouverte, le type de pièce jointe ("Décision administrative", "Avis expert", "Saisine expert", "Autre") et le nombre de fichiers

#### `générerUnDocument`

- **Ce que ça représente :** Générer un document à partir d'un modèle
- **Page :** Page d'un dossier, onglet **"Génération document"**

---

### Impact

#### `retourÀLaConformité`

- **Ce que ça représente :** Une prescription passe de non-conforme à conforme
- **Page :** Page d'un dossier, onglet **"Contrôles"**
- **Action :** Ajouter un contrôle avec le résultat **"Conforme"** alors qu'au moins un contrôle précédent était non-conforme sur la même prescription
