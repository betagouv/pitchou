# ADR-0002 : Structurer les personnes impliquées dans un dossier en base de données

_English version: [0002-structure-porteur-de-projet-in-database.en.md](0002-structure-porteur-de-projet-in-database.en.md)_

## Statut

Accepté

## Contexte

Les personnes impliquées dans un dossier étaient mal distinguées, dans les données comme dans l'équipe. Démarche Numérique demande l'identité du « demandeur », ou bénéficiaire, dans un bloc standard qui ne fait pas partie de notre formulaire et ne contient qu'un prénom et un nom. Les instructrices le remplissaient mal : pour elles, le bénéficiaire est le porteur de projet, souvent une personne morale. Dans l'équipe aussi, demandeur, déposant, bénéficiaire et porteur de projet se confondaient.

Au 8 octobre 2026, la base de production compte 3 098 dossiers Démarche Numérique. Parmi eux, 1 047 n'ont pas la section « Porteur de projet », et 918 déclarent une personne morale sans donner de SIRET. Dans Démarche Numérique, ces informations ne sont pas obligatoires : le SIRET est facultatif, et le type de porteur (« Le demandeur est… ») n'est demandé que si la section « Porteur de projet » s'affiche, ce qui dépend des réponses précédentes du formulaire.

Cet ADR traite le porteur de projet. Les autres personnes impliquées (déposant, mandataire, personne contact) seront structurées plus tard.

## Décision

**Un porteur de projet par dossier.** La colonne `dossier.porteur_de_projet` pointe vers la table `porteur_de_projet`, qui référence soit une `personne_physique`, soit une `entreprise` (la personne morale, identifiée par son SIRET). Une contrainte impose exactement une des deux références.

**Une table `personne_physique` distincte de `personne`.** `personne` impose un email unique, car elle sert aux comptes, et elle est vouée à devenir la table des utilisateurs. Nous ne mélangeons pas utilisateurs et personnes impliquées.

**Pas de contrainte d'unicité sur `personne_physique`.** Nous n'avons aucun identifiant fiable : deux homonymes peuvent partager une adresse de service (deux « John Doe » avec contact@example.com), et une personne peut changer d'email. Fusionner sur ces critères risquerait de mélanger deux personnes : le téléphone de l'une modifierait le dossier de l'autre. Nous préférons des doublons, réutilisables quand on sait qu'il s'agit de la même personne, mais sans fusion automatique.

**Une personne morale est partagée, une personne physique ne l'est pas.** Les dossiers d'un même SIRET partagent leur porteur. Une personne physique reste propre à son dossier, faute de pouvoir la reconnaître d'un dossier à l'autre.

**Un trigger supprime les porteurs orphelins.** Un `porteur_de_projet` n'est qu'un lien : il est supprimé quand plus aucun dossier ne le référence. La `personne_physique` et l'`entreprise` sont conservées. Un trigger plutôt que du code, car plusieurs écrivains modifient le porteur (synchronisation, admin, suppression de dossier).

**Démarche Numérique fait foi pour ses dossiers.** La réponse à « Le demandeur est… » décide du type. Pour une personne physique, nous prenons `dossier.demandeur`, que Démarche Numérique considère comme le bénéficiaire, avec ou sans mandataire. Pour une personne morale, nous prenons le SIRET. Quand Démarche Numérique ne renvoie pas l'établissement, l'entreprise est créée avec son seul SIRET.

**`porteur_de_projet` reste nullable.** Il deviendra obligatoire quand la création d'un dossier pourra l'exiger, ce qui n'est pas le cas aujourd'hui dans Démarche Numérique.

**Sans porteur, l'interface affiche « Non renseigné ».** Elle ne se rabat plus sur le demandeur Démarche Numérique, qui serait une information incorrecte. Celui-ci reste enregistré dans `identite_dossier`.

## Conséquences

Les anciennes colonnes `demandeur_personne_physique` et `demandeur_personne_morale` restent écrites, car elles sont encore lues par les statistiques publiques, GeoMCE et l'historique des modifications d'entreprise de la synchronisation. L'interface ne les lit plus.

Une même personne physique peut exister en plusieurs exemplaires. Si besoin, elles seront fusionnées à la main.

Les dossiers Démarche Numérique sans section porteur, ceux qui déclarent une personne morale sans SIRET, et les dossiers importés (GunEnv, Onagre, fichiers) n'ont pas de porteur.

La balise de document `{demandeur}` devient `{porteur_de_projet}`. L'ancienne reste disponible pour les modèles existants.

En lecture, le porteur est un type union distingué par `type` (`personne_physique` ou `personne_morale`). En écriture, `PorteurDeProjetInitializer` ne porte que le SIRET d'une personne morale.

L'admin exige un porteur à la création d'un dossier, comme à son édition.

Le bloc « Le demandeur » qui s'affichait pour une personne morale est retiré de l'accordéon « Porteur de projet ».
