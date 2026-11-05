# ADR-0005 : Organisations sans établissement identifié

## Statut

Accepté le 4 novembre 2026. Le propriétaire a autorisé l’évolution du modèle et de l’interface, y compris les champs nécessaires. Cette décision complète l’ADR-0002.

## Contexte

Des dossiers Onagre identifient une organisation sans permettre de sélectionner un SIRET. Plusieurs établissements d’une même personne morale peuvent partager la même adresse. D’autres dossiers donnent seulement une déclaration du pétitionnaire, non vérifiée dans un registre. L’absence de SIRET ne signifie donc pas nécessairement l’absence d’identité exploitable.

## Décision

Le porteur peut référencer une personne physique, une entreprise identifiée par son SIRET, ou une organisation sans établissement sélectionné. Une contrainte impose exactement une de ces références.

Une organisation possède un nom, une adresse facultative, un SIREN facultatif, un statut de vérification, la source et sa référence, ainsi qu’une preuve de vérification facultative. Aucun SIRET fictif n’est créé.

- `source_declared` conserve une déclaration de la source. Le SIREN et la preuve de vérification sont nuls. L’interface indique que l’identité reste à vérifier.
- `verified` signifie que l’identité de l’organisation a été vérifiée, mais pas son établissement. Une preuve non vide est obligatoire ; un SIREN vérifié peut être renseigné. L’interface indique « Organisation vérifiée — établissement à confirmer ».

Les organisations sont propres à chaque demande. Ni le nom, ni l’adresse, ni le SIREN ne déclenchent une fusion automatique. Un établissement identifié ultérieurement peut remplacer le porteur par le chemin SIRET existant, sans modifier les contacts. Les données de provenance et les archives d’import restent conservées.

Dans l’administration, un formulaire dédié permet de renseigner un porteur absent ou de vérifier une organisation issue d’Onagre. Il peut aussi remplacer cette organisation par un SIRET confirmé. Cette opération requiert le droit de modification des dossiers, est journalisée et ne modifie que le porteur. Les autres données importées restent en lecture seule.

La déclaration d’une organisation ne doit pas être fabriquée à partir d’un nom de contact, de mandataire ou d’une simple catégorie de pétitionnaire. Les conflits de rôles ou de plusieurs porteurs restent à examiner. Les porteurs déjà identifiés par SIRET et les personnes physiques ne sont pas remplacés lors de l’enrichissement Onagre.

Les listes, la recherche, les détails et les exports rendent le nom accessible avec son statut. Une absence réelle de nom exploitable reste « Non renseigné ». Les documents et statistiques qui ne prennent en charge que les anciens identifiants ne doivent pas recevoir de faux SIRET.

## Conséquences

L’import peut préserver une information utile sans lui attribuer le niveau de confiance d’un rapprochement vérifié. Les comptes de dossiers avec une organisation affichable et ceux avec un SIRET vérifié doivent rester distincts. Les anciennes décisions conservant toutes les identités non résolues uniquement dans l’archive privée sont remplacées pour les déclarations suffisamment explicites.
