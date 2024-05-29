//@ts-check

import { formatISO } from 'date-fns';

import {listAllPersonnes, dumpDossiers, créerPersonnes} from '../scripts/server/database.js'
import {recupérerDossiersRécemmentModifiés} from '../scripts/server/recupérerDossiersRécemmentModifiés.js'

/** @typedef {import('../scripts/types/database/public/Dossier.js').default} Dossier */
/** @typedef {import('../scripts/types/database/public/Personne.js').default} Personne */

// récups les données de DS

const API_TOKEN = process.env.API_TOKEN
if(!API_TOKEN){
  throw new TypeError(`Variable d'environnement API_TOKEN manquante`)
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
    token: API_TOKEN, 
    démarcheId: DEMARCHE_NUMBER, 
    updatedSince: formatISO(new Date(2020, 1, 22))
})

//console.log('démarche', démarche)
//console.log('dossiers', démarche.dossiers.nodes.length)
//console.log('3 dossiers', démarche.dossiers.nodes.slice(0, 3))
//console.log('champs', démarche.dossiers.nodes[0].champs)
console.log('premier dossier', JSON.stringify(démarche.dossiers.nodes[21], null, 2))


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

const allPersonnesCurrentlyInDatabase = await listAllPersonnes();

/** @type {Dossier[]} */
const dossiers = démarche.dossiers.nodes.map(({
    id: id_demarches_simplifiées, 
    dateDepot: date_dépôt, 
    state: statut, 
    demandeur,
    champs,
    annotations
}) => {

    const SIRETChamp = champs.find(({id}) => id === pitchouKeyToChampDS["SIRET"])

    /*if(!SIRETChamp && !demandeur) throw new TypeError(`Champ id ${pitchouKeyToChampDS["SIRET"]} et ${pitchouKeyToChampDS["Nom-Prénom"]} manquants (devrait être le Siret ou le prénom-nom de la personne)`)

    const identité_petitionnaire = SIRETChamp ? 
        SIRETChamp.etablissement && `${SIRETChamp.etablissement.entreprise.raisonSociale} - (${SIRETChamp.etablissement.siret})` || `entreprise inconnue (SIRET: ${SIRETChamp.stringValue})` :
        demandeur.stringValue*/

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
        communes = champCommunes.rows.map(c => c.champs[0].commune)
        départements = [... new Set(champCommunes.rows.map(c => c.champs[0].departement.code))]
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
    delete demandeur.__typename
    delete demandeur.civilite
    let déposant;
    {
        const {prenom: prénoms, nom, email} = demandeur
        déposant = {
            prénoms,
            nom,
            email: email === '' ? undefined : email
        }
    }

    return {
        id_demarches_simplifiées,
        statut,
        date_dépôt,
        //demandeur_physique,
        //demandeur_morale,
        déposant,
        //représentant,
        espèces_protégées_concernées,
        enjeu_écologiques,
        // https://knexjs.org/guide/schema-builder.html#json
        communes: JSON.stringify(communes),
        départements: JSON.stringify(départements),
        //régions: JSON.stringify(régions)
    }
    
})

/** @type {Map<Personne['email'], Personne>} */
const personneByEmail = new Map()
for(const personne of allPersonnesCurrentlyInDatabase){
    if(personne.email){
        personneByEmail.set(personne.email, personne)
    }
}

/** @type {Personne[]} */
const personnesInDossiers = [...new Set(dossiers.map(({déposant}) => [déposant]).flat())]

/**
 * 
 * @param {Personne} descriptionPersonne 
 * @returns {Personne['id'] | undefined}
 */
function getPersonneId(descriptionPersonne){
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

console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if(personnesInDossiersWithoutId.length >= 1){
    await créerPersonnes(personnesInDossiersWithoutId)
    .then((personneIds) => {
        personnesInDossiersWithoutId.forEach((p, i) => {
            p.id = personneIds[i].id
        })
    })
}

console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

dossiers.forEach(d => {
    d.déposant = getPersonneId(d.déposant)
})



/*throw `PPP 
    - le demandeur est une personne physique ou morale (foreign key)
    - le déposant est une personne physique (foreign key)
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