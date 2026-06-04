# Évènements tracqués

## Qu'est-ce qu'un évènement ?

Quand un utilisateur réalise certaines actions dans Pitchou, l'application enregistre silencieusement un **évènement** en base de données. Ces données ne sont pas envoyées à un outil externe : elles restent dans Pitchou et servent à calculer les [indicateurs AARRI](https://beta.gouv.fr/startups/pitchou.html) de l'équipe (Acquis, Actif, Retenu, Impact).

Un évènement correspond à un Action précis : un clic sur un bouton, une modification dans un formulaire, le chargement d'une page. Tous les évènements sont listés ci-dessous.
---

## Les évènements

### Connexion

#### `seConnecter`

| | |
|---|---|
| **Ce que ça représente** | Une connexion à Pitchou |
| **Page** | N'importe quelle page |
| **Action** | Automatique — se déclenche quand l'utilisateur ouvre Pitchou avec un lien d'accès valide |

---

### Consultation

#### `rechercherDesDossiers`

| | |
|---|---|
| **Ce que ça représente** | Utiliser les filtres ou la recherche dans la liste des dossiers |
| **Page** | "Tous les dossiers" |
| **Action** | Modifier un filtre : champ texte de recherche, tags de phase, filtre "activité principale", filtre "prochaine action attendue de", filtre par instructeur |
| **Note** | Déclenché au plus une fois toutes les 10 secondes |

#### `afficherLesDossiersSuivis`

| | |
|---|---|
| **Ce que ça représente** | Filtrer pour n'afficher que les dossiers que je suis |
| **Page** | "Tous les dossiers" |
| **Action** | Cliquer le bouton "Suivi par moi" |

#### `consulterUnDossier`

| | |
|---|---|
| **Ce que ça représente** | Accéder à l'onglet Projet d'un dossier |
| **Page** | Page d'un dossier |
| **Action** | Cliquer sur l'onglet **"Projet"** |
| **Note** | Déclenché au plus une fois toutes les 15 minutes pour le même dossier |

#### `téléchargerListeÉspècesImpactées`

| | |
|---|---|
| **Ce que ça représente** | Télécharger le fichier des espèces impactées d'un dossier |
| **Page** | Page d'un dossier → onglet **"Projet"** |
| **Action** | Cliquer le bouton "Télécharger le fichier des espèces impactées" |

---

### Modification

#### `suivreUnDossier`

| | |
|---|---|
| **Ce que ça représente** | Mettre un dossier en suivi |
| **Page** | "Tous les dossiers" — tableau de dossiers |
| **Action** | Cliquer le bouton "Suivre" sur la ligne d'un dossier |

#### `modifierCommentaireInstruction`

| | |
|---|---|
| **Ce que ça représente** | Rédiger ou modifier le commentaire d'instruction d'un dossier |
| **Page** | Page d'un dossier → onglet **"Instruction"** |
| **Action** | Taper dans le champ commentaire libre |
| **Note** | Déclenché au plus une fois toutes les 15 minutes |

#### `changerPhase`

| | |
|---|---|
| **Ce que ça représente** | Changer la phase d'un dossier |
| **Page** | Page d'un dossier → onglet **"Instruction"** |
| **Action** | Sélectionner une nouvelle phase dans le menu déroulant de phase |

#### `changerProchaineActionAttendueDe`

| | |
|---|---|
| **Ce que ça représente** | Modifier qui est responsable de la prochaine action sur le dossier |
| **Page** | Page d'un dossier → onglet **"Instruction"** |
| **Action** | Sélectionner une option dans le menu déroulant "Prochaine action attendue de" |

#### `ajouterDécisionAdministrative`

| | |
|---|---|
| **Ce que ça représente** | Ajouter une décision administrative à un dossier |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Rajouter une décision administrative" puis valider le formulaire |

#### `modifierDécisionAdministrative`

| | |
|---|---|
| **Ce que ça représente** | Modifier une décision administrative existante |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Modifier" sur une décision puis valider le formulaire |

#### `supprimerDécisionAdministrative`

| | |
|---|---|
| **Ce que ça représente** | Supprimer une décision administrative |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Supprimer cette décision administrative" dans le formulaire de modification |

#### `ajouterPrescription`

| | |
|---|---|
| **Ce que ça représente** | Ajouter une prescription à une décision administrative |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Ajouter une prescription" (saisie manuelle) ou importer un fichier `.ods` de prescriptions |

#### `modifierPrescription`

| | |
|---|---|
| **Ce que ça représente** | Modifier le contenu d'une prescription |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Éditer un champ dans le tableau des prescriptions (numéro article, description, date échéance, métriques de surface/individus) |
| **Note** | Déclenché au plus une fois toutes les 15 minutes |

#### `supprimerPrescription`

| | |
|---|---|
| **Ce que ça représente** | Supprimer une prescription |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer le bouton "Supprimer" sur la ligne d'une prescription |

#### `ajouterContrôle`

| | |
|---|---|
| **Ce que ça représente** | Ajouter un contrôle de conformité sur une prescription |
| **Page** | Page d'un dossier → onglet **"Contrôles"** → section d'une prescription |
| **Action** | Cliquer "Ajouter un contrôle" puis valider le formulaire (date, résultat, commentaire) |

#### `modifierContrôle`

| | |
|---|---|
| **Ce que ça représente** | Modifier un contrôle existant |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Modifier" sur un contrôle puis valider le formulaire |

#### `supprimerContrôle`

| | |
|---|---|
| **Ce que ça représente** | Supprimer un contrôle |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Cliquer "Supprimer" dans le formulaire de modification d'un contrôle |

#### `ajouterAvisExpert`

| | |
|---|---|
| **Ce que ça représente** | Ajouter un avis expert ou une saisine |
| **Page** | Page d'un dossier → onglet **"Avis"** |
| **Action** | Cliquer "Ajouter un avis ou une saisine" puis valider le formulaire dans la modale |

#### `modifierAvisExpert`

| | |
|---|---|
| **Ce que ça représente** | Modifier un avis expert existant |
| **Page** | Page d'un dossier → onglet **"Avis"** |
| **Action** | Modifier un avis existant puis valider |

#### `supprimerAvisExpert`

| | |
|---|---|
| **Ce que ça représente** | Supprimer un avis expert |
| **Page** | Page d'un dossier → onglet **"Avis"** |
| **Action** | Cliquer le bouton de suppression sur un avis |

#### `générerUnDocument`

| | |
|---|---|
| **Ce que ça représente** | Générer un document à partir d'un modèle |
| **Page** | Page d'un dossier → onglet **"Génération document"** |
| **Action** | Sélectionner un fichier modèle `.odt` puis cliquer "Générer le document !" |

---

### Impact

#### `retourÀLaConformité`

| | |
|---|---|
| **Ce que ça représente** | Une prescription passe de non-conforme à conforme |
| **Page** | Page d'un dossier → onglet **"Contrôles"** |
| **Action** | Ajouter un contrôle avec le résultat **"Conforme"** alors qu'au moins un contrôle précédent était non-conforme sur la même prescription |
| **Note** | Cet évènement n'est pas déclenché à chaque ajout de contrôle "Conforme" — seulement quand il y a eu une non-conformité antérieure. C'est lui qui alimente l'indicateur AARRI **Impact**. |
