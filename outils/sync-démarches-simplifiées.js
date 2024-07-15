//@ts-check

import { formatISO } from 'date-fns';

import {listAllPersonnes, listAllEntreprises, dumpDossiers, dumpEntreprises, créerPersonnes} from '../scripts/server/database.js'
import {recupérerDossiersRécemmentModifiés} from '../scripts/server/recupérerDossiersRécemmentModifiés.js'

/** @typedef {import('../scripts/types/database/public/Dossier.js').default} Dossier */
/** @typedef {import('../scripts/types/database/public/Personne.js').default} Personne */
/** @typedef {import('../scripts/types/database/public/Entreprise.js').default} Entreprise */

// récups les données de DS

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

const DEMARCHE_NUMBER = process.env.DEMARCHE_NUMBER
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}



const démarche = await recupérerDossiersRécemmentModifiés({
    token: DEMARCHE_SIMPLIFIEE_API_TOKEN, 
    démarcheId: DEMARCHE_NUMBER, 
    updatedSince: formatISO(new Date(2020, 1, 22))
})

//console.log('démarche', démarche)
//console.log('dossiers', démarche.dossiers.nodes.length)
//console.log('3 dossiers', démarche.dossiers.nodes.slice(0, 3))
//console.log('champs', démarche.dossiers.nodes[0].champs)
console.log('un dossier', JSON.stringify(démarche.dossiers.nodes[21], null, 2))


// stocker les dossiers en BDD

const pitchouKeyToChampDS = {
    "SIRET": "Q2hhbXAtMzg5NzM5NA==",
    "Nom-Prénom": "Q2hhbXAtMzg5NzM1NA==",
    "espèces_protégées_concernées": 'Q2hhbXAtMzg5NzQwNQ==',
    "communes": 'Q2hhbXAtNDA0MTQ0MQ==',
    "départements" : 'Q2hhbXAtNDA0MTQ0NQ==',
    "régions" : 'Q2hhbXAtNDA0MTQ0OA==',
    "Le projet se situe au niveau…": 'Q2hhbXAtMzg5NzQwOA=='
}

const pitchouKeyToAnnotationDS = {
    "enjeu_écologiques": "Q2hhbXAtNDAwMTQ3MQ=="
}

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes();
const allEntreprisesCurrentlyInDatabase = listAllEntreprises();

/** @type {Dossier[]} */
const dossiers = démarche.dossiers.nodes.map(({
    id: id_demarches_simplifiées, 
    dateDepot: date_dépôt, 
    state: statut, 
    demandeur,
    champs,
    annotations
}) => {

    const espèces_protégées_concernées = champs.find(({id}) => id === pitchouKeyToChampDS["espèces_protégées_concernées"]).stringValue

    /* localisation */
    const projetSitué = champs.find(({id}) => id === pitchouKeyToChampDS["Le projet se situe au niveau…"]).stringValue
    const champCommunes = champs.find(({id}) => id === pitchouKeyToChampDS["communes"])
    const champDépartements = champs.find(({id}) => id === pitchouKeyToChampDS["départements"])
    const champRégions = champs.find(({id}) => id === pitchouKeyToChampDS["régions"])

    let communes;
    let départements;
    let régions;

    if(champCommunes){
        communes = champCommunes.rows.map(c => c.champs[0].commune).filter(x => !!x)
        
        if(Array.isArray(communes) && communes.length >= 1){
            départements = [... new Set(champCommunes.rows.map(c => c.champs[0].departement.code))]
        }
    }
    else{
        if(champDépartements){
            départements = [... new Set(champDépartements.rows.map(c => c.champs[0].departement.code))]
        }
        else{
            if(champRégions){
                régions = [... new Set(champRégions.rows.map(c => c.champs[0].stringValue))]
            }
            else{
                if(projetSitué){
                    console.log('localisation manquante', projetSitué, champs)
                    process.exit(1)
                }
            }
        }
    }

    const enjeu_écologiques = annotations.find(({id}) => id === pitchouKeyToAnnotationDS["enjeu_écologiques"]).stringValue

    /*
    déposant 

    Le déposant est la personne qui dépose le dossier sur DS
    Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique 
    qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose le dossier, 
    Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur

    Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" 
    (qui est différent de notre "demandeur")

    */

    /** @type {import('../scripts/types/database/public/Personne.js').PersonneInitializer} */
    let déposant;
    {
        const {prenom: prénoms, nom, email} = demandeur
        déposant = {
            prénoms,
            nom,
            email: email === '' ? undefined : email
        }
    }

    /*
        demandeur
     
        Personne physique ou morale qui formule la demande de dérogation espèces protégées

    */

    /** @type {import('../scripts/types/database/public/Personne.js').PersonneInitializer | undefined} */
    let demandeur_personne_physique = undefined;
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined

    const SIRETChamp = champs.find(({id}) => id === pitchouKeyToChampDS["SIRET"])
    if(!SIRETChamp){
        demandeur_personne_physique = déposant;
    }
    else{
        const etablissement = SIRETChamp.etablissement
        if(etablissement){
            const { siret, address = {}, entreprise = {}} = etablissement
            const {streetAddress, postalCode, cityName} = address
            const {raisonSociale} = entreprise


            demandeur_personne_morale = {
                siret,
                raison_sociale: raisonSociale,
                adresse: `${streetAddress} ${postalCode} ${cityName}`
            }
        }
    }


    return {
        id_demarches_simplifiées,
        statut,
        date_dépôt,
        demandeur_personne_physique,
        demandeur_personne_morale,
        déposant,
        //représentant,
        espèces_protégées_concernées,
        enjeu_écologiques,
        // https://knexjs.org/guide/schema-builder.html#json
        communes: JSON.stringify(communes),
        départements: JSON.stringify(départements),
        régions: JSON.stringify(régions)
    }
    
})

/*
    Créer toutes les personnes manquantes en BDD pour qu'elles aient toutes un id
*/

/** @type {Map<Personne['email'], Personne>} */
const personneByEmail = new Map()
const allPersonnesCurrentlyInDatabase = await allPersonnesCurrentlyInDatabaseP

for(const personne of allPersonnesCurrentlyInDatabase){
    if(personne.email){
        personneByEmail.set(personne.email, personne)
    }
}

/** @type {Personne[]} */
const personnesInDossiers = [...new Set(dossiers.map(({déposant, demandeur_personne_physique}) => [déposant, demandeur_personne_physique].filter(p => !!p)).flat())]

/**
 * 
 * @param {Personne | undefined} descriptionPersonne 
 * @returns {Personne['id'] | undefined}
 */
function getPersonneId(descriptionPersonne){
    if(!descriptionPersonne){
        return undefined
    }

    if(descriptionPersonne.id){
        return descriptionPersonne.id
    }

    if(descriptionPersonne.email){
        const personne = personneByEmail.get(descriptionPersonne.email)
        return personne && personne.id
    }

    const personneParNomPrénom = allPersonnesCurrentlyInDatabase.find(
        ({email, nom, prénoms}) => !email && descriptionPersonne.nom === nom && descriptionPersonne.prénoms === prénoms
    )

    return personneParNomPrénom && personneParNomPrénom.id
}

const personnesInDossiersWithoutId = personnesInDossiers.filter(p => !getPersonneId(p))

//console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if(personnesInDossiersWithoutId.length >= 1){
    await créerPersonnes(personnesInDossiersWithoutId)
    .then((personneIds) => {
        personnesInDossiersWithoutId.forEach((p, i) => {
            p.id = personneIds[i].id
        })
    })
}

//console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

/*
    Après avoir créé les personnes, remplacer les objets Personne par leur id
*/
dossiers.forEach(d => {
    d.déposant = getPersonneId(d.déposant)
    d.demandeur_personne_physique = getPersonneId(d.demandeur_personne_physique)
})


/*
    Rajouter les entreprises demandeuses qui ne sont pas déjà en BDD
*/

/** @type {Map<Entreprise['siret'], Entreprise} */
const entreprisesInDossiersBySiret = new Map()

for(const {demandeur_personne_morale, id, id_demarches_simplifiées} of dossiers){
    if(demandeur_personne_morale){
        const {siret} = demandeur_personne_morale
        if(demandeur_personne_morale && !siret){
            throw new TypeError(`Siret manquant pour l'entreprise ${JSON.stringify(demandeur_personne_morale)} (id: ${id}, DS: ${id_demarches_simplifiées})`)
        }
        
        entreprisesInDossiersBySiret.set(siret, demandeur_personne_morale)
    }
    
    
}

await dumpEntreprises([...entreprisesInDossiersBySiret.values()])

/*
    Après avoir créé les dossiers, remplacer les objets Entreprise par leur siret
*/
dossiers.forEach(d => {
    d.demandeur_personne_morale = d.demandeur_personne_morale && d.demandeur_personne_morale.siret
})


/*throw `PPP 
    - le demandeur est une personne physique ou morale (foreign key)
    - le représentant est une personne physique (foreign key)
    - les instructeurs sont des personnes (foreign key)
        - besoin de recup les groupes d'instructeurs de la démarche
`*/



dumpDossiers(dossiers)
.catch(err => {
    console.error('sync démarche simplifiée database error', err)
    process.exit(1)
})
.then(() => process.exit())
