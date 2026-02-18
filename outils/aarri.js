//@ts-check
import {writeFile} from 'node:fs/promises'
import parseArgs from 'minimist'
import { getPremièreSemaineActivéFromÉvènements, getÉvènementsCountForPersonne, getÉvènementsForPersonne } from '../scripts/server/database/aarri/utils.js';
import {createOdsFile} from '@odfjs/odfjs'

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

const évènementsColonneDate = évènements.map((évènement) => ([{
    value: évènement.date,
    type: 'string'
}]));

const content = new Map([
    [
        'Évènements',
        évènementsColonneDate,
    ],
    [
        "L'autre feuille",
        [
            [
                {value: évènements[0].date, type: 'string'},
                {value: '2', type: 'string'},
                {value: '3', type: 'string'},
                {value: '5', type: 'string'},
                {value: '8', type: 'string'}
            ],
            [
                {value: '1', type: 'string'},
                {value: '2', type: 'string'},
                {value: '3', type: 'string'},
                {value: '5', type: 'string'},
                {value: '8', type: 'string'}
            ]
        ],
    ]
])

/** @type {ArrayBuffer} */
const ods = await createOdsFile(content)

async function example() {
  try {
    await writeFile('./test.ods', Buffer.from(ods));
  } catch (err) {
    console.log(err);
  }
}
await example();

process.exit(0)