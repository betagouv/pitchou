## Page d'un dossier

### Onglet Instruction

- **Affichage et mise à jour de l’entête du dossier**

  Étapes :
  1. Ouvrir un dossier.
  2. Vérifier que les informations affichées sont correctes.
  3. Cliquer sur _Ne plus suivre_.
  4. Vérifier que l’état de suivi est mis à jour et que le dossier n’est plus suivi.

  Résultat attendu :
  - Informations correctes et mise à jour du suivi effective.

- **Consultation de l’historique dans l’onglet _Instruction_**

  Étapes :
  1. Aller dans l’onglet _Instruction_.
  2. Vérifier que l’historique du dossier est affiché.

  Résultat attendu :
  - Historique complet et conforme.

- **Modification des champs du dossier**

  Étapes :
  1. Dans _Instruction_, modifier des champs comme _Commentaire libre_ ou _Phase du dossier_.
  2. Vérifier la mise à jour instantanée.
  3. Recharger la page et confirmer la persistance des modifications.

  Résultat attendu :
  - Modifications enregistrées et persistantes après rechargement.

- **Accès aux annotations privées sur Démarche Numérique (DN)**  
  Étapes :
  1. Cliquer sur _Annotations privées_.
  2. Vérifier la redirection vers la page DS correspondant au dossier.  
     Résultat attendu :
  - Redirection correcte vers DS du dossier.

### Onglet Projet

- **Affichage des informations du projet**

  Étapes :
  1. Ouvrir un dossier.
  2. Vérifier que les informations du projet sont correctement affichées.

  Résultat attendu :
  - Informations affichées correctement.

- **Affichage des espèces impactées**

  Étapes :
  1. Consulter la section _Espèces impactées_.
  2. Vérifier la présence et l’exactitude des données si elles existent.

  Résultat attendu :
  - Liste correcte ou absence affichée si aucune espèce impactée.

- **Accès au dossier déposé sur Démarche Numérique**

  Étapes :
  1. Repérer le bouton _Dossier déposé sur Démarche Numérique_.
  2. Cliquer dessus.
  3. Vérifier la redirection vers la bonne page sur Démarche Numérique.

  Résultat attendu :
  - Redirection réussie vers le dossier sur DS.

### Onglet Échanges

- **Répondre sur Démarche Numérique**

  Étapes :
  1. Appuyer sur le bouton _Répondre sur Démarche Numérique_.
  2. Vérifier la redirection vers la bonne page sur Démarche Numérique.

  Résultat attendu :
  - Redirection correcte vers la page du dossier sur DS.

- **Affichage des échanges avec le pétitionnaire**

  Étapes :
  1. Ouvrir l’onglet _Échanges_.
  2. Vérifier que tous les échanges avec le pétitionnaire envoyés via `contact@demarches_simplifiees.fr` sont affichés, s’il y en a eu.
  3. Confirmer que les échanges sont triés par date d’envoi, de la plus récente à la plus ancienne.

  Résultat attendu :
  - Liste complète des échanges affichée et triée correctement.

### Onglet Avis

Rien à tester pour le moment.

### Onglet Contrôles

- **Affichage sans décision administrative**

  Étapes :
  1. Ouvrir l’onglet _Contrôles_.
  2. Vérifier qu’aucune décision administrative n’est enregistrée.
  3. Observer qu’une phrase indique _aucune décision administrative_ et qu’un bouton _Rajouter une décision administrative_ est présent.

  Résultat attendu :
  - Message et bouton affichés correctement en l’absence de décision.

- **Affichage avec décisions administratives**

  Étapes :
  1. Ouvrir l’onglet _Contrôles_ lorsqu’une ou plusieurs décisions administratives existent.
  2. Vérifier que la liste des décisions est affichée, triée par date (plus récente en haut).
  3. Vérifier que chaque décision est groupée avec ses prescriptions si elles existent.
  4. Si aucune prescription pour une décision, vérifier l’affichage d’une phrase _pas de prescription_ et la présence d’un bouton _Ajouter une prescription_.
  5. Vérifier la présence d’un champ permettant d’importer directement un fichier de prescriptions.

  Résultat attendu :
  - Liste et regroupements corrects, messages et boutons conformes.

- **Modification d’une décision administrative**  
  Étapes :
  1. Lorsqu’une décision administrative est affichée, cliquer sur _Modifier_.
  2. Vérifier l’apparition d’un formulaire avec les champs :
     - Choisir un fichier
     - Numéro
     - Type de décision
     - Date de signature de la décision administrative
     - Date de fin des obligations
  3. Vérifier la présence des boutons _Sauvegarder_ et _Annuler_.
  4. Vérifier la présence d’un bouton _Supprimer cette décision administrative_ et son bon fonctionnement.

  Résultat attendu :
  - Formulaire et actions disponibles, modification et suppression fonctionnelles.

- **Ajout d’une décision administrative**

  Étapes :
  1. Cliquer sur _Rajouter une décision administrative_.
  2. Vérifier l’apparition du même formulaire que pour la modification.
  3. Vérifier la présence des boutons _Sauvegarder_ et _Annuler_.

  Résultat attendu :
  - Formulaire affiché correctement et prêt à l’enregistrement.

- **Affichage d’une prescription**

  Étapes :
  1. Déplier une prescription associée à une décision administrative.
  2. Vérifier que sont affichés :
     - Le titre
     - Le numéro d’article
     - La date d’échéance
     - Le nombre de contrôles

  Résultat attendu :
  - Informations de prescription affichées correctement.

- **Ajouter une prescription**  
  Étapes :
  1. Cliquer sur "Ajouter une prescription"
  2. Vérifier que le formulaire-tableau s'ouvre
  3. Rajouter une prescription avec toutes les infos
  4. Valider

  Résultat attendu :
  - Vérifier que la prescription est ajoutée

- **Modifier une prescription**
- **Supprimer une prescription**

- **Affichage des contrôles**

  Étapes :
  1. Ouvrir les contrôles d'une prescription
  2. Vérifier que sont affichés :
     - date du contrôle
     - résultat
     - commentaire
     - Action suite au contrôle
     - Date action suite au contrôle
     - Date prochaine échéance
     - le bouton "Modifier"
     - le bouton "Ajouter un contrôle"

  Résultat attendu :
  - Informations de prescription affichées correctement.

- **Modifier un contrôle**
- **Supprimer un contrôle**

---

## Onglet Génération document

- **Générer un document**

  Étapes :
  1. Choisir un fichier odt avec des balises
  2. Appuyer sur le bouton Générer le document

  Résultat attendu :
  - Si le dossier a bien un fichier espèces impactées au bon format, alors on voit le document généré dans le texte brut et le lien "Télécharger document généré" apparaît, et cliquable et fonctionne.

---
