//@ts-check

/*
    Dans ce fichier, on s'intéresse spécifiquement à la démarche 88444

    https://www.demarches-simplifiees.fr/admin/procedures/88444
    https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees
    https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees

*/

// Créée à partir du schema https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema
// qui a été copié ici : data/schema-DS-88444.json (et devrait être mis à jour)
/* 

await fetch('https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema')
    .then(r => r.json())
    .then(schema => schema.revision.champDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id])
    ) 

*/

/** @typedef {import('../types.js').DossierDémarcheSimplifiée88444} DossierDémarcheSimplifiée88444 */


/** @type {Map< keyof DossierDémarcheSimplifiée88444, string >} */
const démarcheDossierLabelToId = new Map([
    [
      "Le demandeur est…",
      "Q2hhbXAtMzg5ODg5NQ=="
    ],
    [
      "Numéro de SIRET",
      "Q2hhbXAtMzg5NzM5NA=="
    ],
    [
      "Qualification",
      "Q2hhbXAtMzg5NzM1NQ=="
    ],
    [
      "Adresse",
      "Q2hhbXAtMzg5NzM2Mg=="
    ],
    [
      "Objet du projet",
      "Q2hhbXAtMzg5NzQwMA=="
    ],
    [
      "Nom du représentant",
      "Q2hhbXAtMzg5NzM5Nw=="
    ],
    [
      "Prénom du représentant",
      "Q2hhbXAtNDIzMDU1OA=="
    ],
    [
      "Qualité du représentant",
      "Q2hhbXAtMzg5NzM5OA=="
    ],
    [
      "Numéro de téléphone de contact",
      "Q2hhbXAtMzkzMzczNg=="
    ],
    [
      "Adresse mail de contact",
      "Q2hhbXAtMzkzMzc0MA=="
    ],
    [
      "Le projet est-il soumis à une autorisation environnementale ?",
      "Q2hhbXAtNDA4MzAxMQ=="
    ],
    [
      "À quelle procédure le projet est-il soumis ?",
      "Q2hhbXAtNDA4Mjk1OA=="
    ],
    [
      "Motif de la dérogation",
      "Q2hhbXAtMzg5NzQwMg=="
    ],
    [
      "Précisez",
      "Q2hhbXAtNDAzMzk0OA=="
    ],
    [
      "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation",
      "Q2hhbXAtNDA0MDgyMQ=="
    ],
    [
      "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet",
      "Q2hhbXAtNDA0MDgyNg=="
    ],
    [
      "Détails du programme d’activité",
      "Q2hhbXAtMzg5NzQwNA=="
    ],
    [
      "Lien vers la liste des espèces concernées",
      "Q2hhbXAtMzg5NzQwNQ=="
    ],
    [
      "Nom du projet",
      "Q2hhbXAtNDE0OTExNQ=="
    ],
    [
      "Cette demande concerne un programme déjà existant",
      "Q2hhbXAtMzkyMzYyNA=="
    ],
    [
      "Le projet se situe au niveau…",
      "Q2hhbXAtMzg5NzQwOA=="
    ],
    [
      "Commune(s) où se situe le projet",
      "Q2hhbXAtNDA0MTQ0MQ=="
    ],
    [
      "Département(s) où se situe le projet",
      "Q2hhbXAtNDA0MTQ0NQ=="
    ],
    [
      "Région(s) où se situe le projet",
      "Q2hhbXAtNDA0MTQ0OA=="
    ],
    [
      "Date de début d’intervention",
      "Q2hhbXAtMzg5NzQ3NA=="
    ],
    [
      "Date de fin d’intervention",
      "Q2hhbXAtMzkyMzYyNg=="
    ],
    [
      "Date de début de chantier",
      "Q2hhbXAtMzg5NzUwMg=="
    ],
    [
      "Date de fin de chantier",
      "Q2hhbXAtMzkyMzYzMQ=="
    ],
    [
      "Qualification des personnes amenées à intervenir",
      "Q2hhbXAtMzg5NzQ3Ng=="
    ],
    [
      "Modalités techniques de l'intervention",
      "Q2hhbXAtMzg5NzQ5OQ=="
    ],
    [
      "Bilan d'opérations antérieures",
      "Q2hhbXAtMzkyMzY1Ng=="
    ],
    [
      "Description succincte du projet",
      "Q2hhbXAtMzkyMzY2OA=="
    ],
    [
      "Dépot du dossier complet de demande de dérogation",
      "Q2hhbXAtMzkyMzY2OQ=="
    ],
    [
      "Mesures d'évitement, réduction et/ou compensation",
      "Q2hhbXAtMzg5NzUwOQ=="
    ]
])

/**
 *  champ_Q2hhbXAtNDA0MTQ0MQ[][champ_Q2hhbXAtNDA0MTQ0Mw]=["01500", "01004"]&champ_Q2hhbXAtNDA0MTQ0MQ[][champ_Q2hhbXAtNDA0MTQ0Mw]=["01500", "01004"]
 * @param {GeoAPICommune} commune 
 */
function makeCommuneParam({code, codesPostaux: [codePostal]}){
  const communeChamp = `champ_${démarcheDossierLabelToId.get('Commune(s) où se situe le projet')}`
  // Voir https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees
  const communeChampRépété = `champ_Q2hhbXAtNDA0MTQ0Mw`

  return `${encodeURIComponent(communeChamp)}[][${communeChampRépété}]=["${codePostal}", "${code}"]`
}

/** @type {(keyof DossierDémarcheSimplifiée88444)[]} */
const champsPourPréremplissage = [
    "Le demandeur est…",
    "Objet du projet",
    "Nom du représentant",
    "Prénom du représentant",
    "Adresse mail de contact",
    "Le projet est-il soumis à une autorisation environnementale ?",
    "Lien vers la liste des espèces concernées",
    "Nom du projet",
    "Le projet se situe au niveau…",
    "Commune(s) où se situe le projet",
    "Département(s) où se situe le projet",
    "Région(s) où se situe le projet"
]

const basePréremplissage = `https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees?`

/**
 * @param {DossierDémarcheSimplifiée88444} dossierPartiel
 */
export function créerLienPréremplissageDémarche(dossierPartiel){
    /** @type {Record<string, string>} */
    const objetPréremplissage = {};

    for(const champ of champsPourPréremplissage){
        if(!['Commune(s) où se situe le projet', 'Département(s) où se situe le projet', 'Région(s) où se situe le projet'].includes(champ)){

          /** @type {DossierDémarcheSimplifiée88444[keyof DossierDémarcheSimplifiée88444]} */
          const valeur = dossierPartiel[champ]
          if(valeur){
              // le `champ_` est une convention pour le pré-remplissage de Démarches Simplifiées
              objetPréremplissage[`champ_${démarcheDossierLabelToId.get(champ)}`] = valeur.toString()
          }
        }
    }

    if(!dossierPartiel['Le demandeur est…']){
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le demandeur est…')}`] = "une personne morale"
    }

    // recups les communes

    let communesURLParam = ''

    if(Array.isArray(dossierPartiel['Commune(s) où se situe le projet']) && dossierPartiel['Commune(s) où se situe le projet'].length >= 1){
        // Un tableau de dictionnaires avec les valeurs possibles pour chaque champ de la répétition.
        // champ_Q2hhbXAtNDA0MTQ0Mw: Un tableau contenant le code postal et le code INSEE de la commune
        // Exemple 	[{"champ_Q2hhbXAtNDA0MTQ0Mw"=>"[\"01500\", \"01004\"]"}, {"champ_Q2hhbXAtNDA0MTQ0Mw"=>"[\"01500\", \"01004\"]"}] 

        /*
        throw `PPP
          Ce code ne fonctionne pas pour le moment
          https://mattermost.incubateur.net/betagouv/pl/77jbtccr17fjdjk794nu3y6kpo
          https://mattermost.incubateur.net/betagouv/pl/nppj3hai1trg5qut8aqhkekdxh
        `

        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le projet se situe au niveau…')}`] = "d'une ou plusieurs communes"

        communesURLParam = dossierPartiel['Commune(s) où se situe le projet']
          .filter(commune => Object(commune) === commune)
          .map(makeCommuneParam)
          .join('&')
        */

    }

    console.log('communesURLParam', communesURLParam)

    /*throw `PPP :
        - faire un remplissage spécifique pour le type de projet, basé sur le tableau de Vanessa`
    */    

    //console.log('objetPréremplissage', objetPréremplissage, dossierPartiel)

    return basePréremplissage + 
      (new URLSearchParams(objetPréremplissage)).toString() + 
      (communesURLParam ? '&' + communesURLParam : '')

}

