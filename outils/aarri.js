//@ts-check

import parseArgs from 'minimist'
import { getPremièreSemaineActivéFromÉvènements, getÉvènementsCountForPersonne, getÉvènementsForPersonne } from '../scripts/server/database/aarri/utils.js';

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const args = parseArgs(process.argv)

if (!args.email) {
    console.error(`Il manque le paramètre --email`);
    process.exit(1)
}

const email = args.email

const évènements = await getÉvènementsForPersonne(email)
const évènementsCount = await getÉvènementsCountForPersonne(email)
const premièreSemaineActive = getPremièreSemaineActivéFromÉvènements(évènements)

console.log('évènements: ', évènements.length, ', évènementsCount: ', évènementsCount.length)
console.log('première semaine active : ', premièreSemaineActive)

process.exit(0)