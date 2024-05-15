//@ts-check

import { formatISO } from 'date-fns';
import knex from 'knex';

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/recupérerDossiersRécemmentModifiés.js'

/** @typedef {import('../scripts/types/database/public/Dossier.js').default} Dossier */

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

const database = knex({
    client: 'pg',
    connection: DATABASE_URL,
});

const démarche = await recupérerDossiersRécemmentModifiés({
    token: API_TOKEN, 
    démarcheId: DEMARCHE_NUMBER, 
    updatedSince: formatISO(new Date(2020, 1, 22))
})

//console.log('démarche', démarche)
console.log('dossiers', démarche.dossiers.nodes.length)
console.log('3 dossiers', démarche.dossiers.nodes.slice(0, 3))
console.log('champs', démarche.dossiers.nodes[0].champs)


// stocker les dossiers en BDD

const pitchouKeyToChampDS = {
    "SIRET": "Q2hhbXAtMzg5NzM5NA==",
    "Nom-Prénom": "Q2hhbXAtMzg5NzM1NA==",
    "espèces_protégées_concernées": 'Q2hhbXAtMzg5NzQwNQ==',
    "communes": 'Q2hhbXAtNDA0MTQ0MQ==',
    "départements" : 'Q2hhbXAtNDA0MTQ0NQ==',
    "Le projet se situe au niveau…": 'Q2hhbXAtMzg5NzQwOA=='
}

const pitchouKeyToAnnotationDS = {
    "enjeu_écologiques": "Q2hhbXAtNDAwMTQ3MQ=="
}



/** @type {Dossier[]} */
const dossiers = démarche.dossiers.nodes.map(({
    id: id_demarches_simplifiées, 
    dateDepot: date_dépôt, 
    state: statut, 
    champs,
    annotations
}) => {

    const SIRETChamp = champs.find(({id}) => id === pitchouKeyToChampDS["SIRET"])
    const NomPrenomChamp = champs.find(({id}) => id === pitchouKeyToChampDS["Nom-Prénom"])

    if(!SIRETChamp && !NomPrenomChamp) throw new TypeError(`Champ id ${pitchouKeyToChampDS["SIRET"]} et ${pitchouKeyToChampDS["Nom-Prénom"]} manquants (devrait être le Siret ou le prénom-nom de la personne)`)

    const identité_petitionnaire = SIRETChamp ? 
        SIRETChamp.etablissement && `${SIRETChamp.etablissement.entreprise.raisonSociale} - (${SIRETChamp.etablissement.siret})` || `entreprise inconnue (SIRET: ${SIRETChamp.stringValue})` :
        NomPrenomChamp.stringValue

    const espèces_protégées_concernées = champs.find(({id}) => id === pitchouKeyToChampDS["espèces_protégées_concernées"]).stringValue

    const champCommunes = champs.find(({id}) => id === pitchouKeyToChampDS["communes"])
    const communes = champCommunes && champCommunes.rows.map(c => c.champs[0])

    const champDépartements = champs.find(({id}) => id === pitchouKeyToChampDS["départements"])
    const départements = champDépartements && champDépartements.rows.map(c => c.champs[0])

    console.log('communes', communes)
    console.log('départements', départements)

    const localisation = communes || départements;

    const projetSitué = champs.find(({id}) => id === pitchouKeyToChampDS["Le projet se situe au niveau…"]).stringValue

    if(!localisation && projetSitué){
        console.log('localisation manquante', projetSitué, champs)
        process.exit(1)
    }


    const enjeu_écologiques = annotations.find(({id}) => id === pitchouKeyToAnnotationDS["enjeu_écologiques"]).stringValue

    return {
        id_demarches_simplifiées,
        statut,
        date_dépôt,
        identité_petitionnaire,
        espèces_protégées_concernées,
        enjeu_écologiques,
        localisation
    }
})



/*database('dossier')
.insert(dossiers)
.onConflict('id_demarches_simplifiées')
.merge()
.catch(err => {
    console.error('sync démarche simplifiée database error', err)
    process.exit(1)
})
.then(() => process.exit())*/