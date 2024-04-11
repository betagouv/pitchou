//@ts-check
import '../scripts/types/database/public/Dossier.js'

import { formatISO } from 'date-fns';
import knex from 'knex';

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/recupérerDossiersRécemmentModifiés.js'

// récups les données de DS

const API_TOKEN = process.env.API_TOKEN
if(!API_TOKEN){
  throw new TypeError(`Variable d'environnement API_TOKEN manquante`)
}

const DEMARCHE_NUMBER = process.env.DEMARCHE_NUMBER
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}

const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING
if(!PG_CONNECTION_STRING){
  throw new TypeError(`Variable d'environnement PG_CONNECTION_STRING manquante`)
}

const database = knex({
    client: 'pg',
    connection: PG_CONNECTION_STRING,
});

const démarche = await recupérerDossiersRécemmentModifiés({
    token: API_TOKEN, 
    démarcheId: DEMARCHE_NUMBER, 
    updatedSince: formatISO(new Date(2020, 1, 22))
})

console.log('démarche', démarche)
console.log('dossiers', démarche.dossiers.nodes)

/*

id: { type: 'int', primaryKey: true },
id_demarches_simplifiées: { type: 'string' },
statut: { type: 'string' },
date_dépôt: { type: 'datetime' },
identité_petitionnaire: { type: 'string'},
espèces_protégées_concernées: { type: 'string' },
enjeu_écologiques: { type: 'string' }

*/

// stocker les dossiers en BDD

const pitchouKeyToChampDS = Object.assign(Object.create(null), {
    "SIRET": "Q2hhbXAtMzg5NzM5NA==",
    "Nom-Prénom": "Q2hhbXAtMzg5NzM1NA==",
    "espèces_protégées_concernées": 'Q2hhbXAtMzg5NzQwNQ=='
})

const pitchouKeyToAnnotationDS = Object.assign(Object.create(null), {
    "enjeu_écologiques": "Q2hhbXAtNDAwMTQ3MQ=="
})

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

    const enjeu_écologiques = annotations.find(({id}) => id === pitchouKeyToAnnotationDS["enjeu_écologiques"]).stringValue

    return {
        id_demarches_simplifiées,
        statut,
        date_dépôt,
        identité_petitionnaire,
        espèces_protégées_concernées,
        enjeu_écologiques
    }
})

console.log('dossiers', dossiers)

database('dossier')
.insert(dossiers)
.catch(err => console.error('yoooooo', err))