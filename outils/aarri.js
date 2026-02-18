//@ts-check
import {writeFile} from 'node:fs/promises'
import parseArgs from 'minimist'
import {getÉvènementsCountForPersonne, getÉvènementsForPersonne } from '../scripts/server/database/aarri/utils.js';
import {createOdsFile} from '@odfjs/odfjs'
import { formatDateAbsolue } from '../scripts/front-end/affichageDossier.js';
import { extraireNomDunMail } from '../scripts/front-end/actions/importDossierUtils.js';

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

console.log(`Mail de la personne concernée : ${email}`)
console.log(`Début des Calculs des données AARRI.`)

const évènements = await getÉvènementsForPersonne(email)
const évènementsCount = await getÉvènementsCountForPersonne(email)

console.log(`✅ Résultats :`)
console.log('Cette personne a enregistré', évènements.length, ' ','évènements depuis le',`${formatDateAbsolue(évènements.at(-1)?.date)}`)

// Création du fichier ODS pour stocker les résultats
const évènementsFormattésPourODS = évènements.map( ({ date, évènement, détails } ) => ([
    {
      value: formatDateAbsolue(date, 'dd/MM/yyyy'),
      type: 'string'
    }, 
    {
      value: évènement,
      type: 'string'
    },
    {
      value: détails ? JSON.stringify(détails) : ' ',
      type: 'string'
    }
]));

const headerÉvènements = [[
  {
    value: "Date de l'évènement",
    type: 'string'
  },
  {
    value: 'Évènement',
    type: 'string'
  },
  {
    value: "Détails concernant l'évènement",
    type: 'string'
  }
]]
const évènementCountsFormattésPourODS = évènementsCount.map( ({ évènement, count } ) => ([
    {
      value: évènement,
      type: 'string'
    },
    {
      value: count,
      type: 'number'
    },
]));


const headerÉvènementsCount = [[
{
  value: 'Évènement',
  type: 'string'
},
{
  value: "Nombre de fois que l'évènement a été enregistré",
  type: 'string'
}]]

const { prénom, nom } = extraireNomDunMail(email)
const aujourdhui = new Date()

const content = new Map([
    [
      'Informations',
        [
          [
            {
              value: `Les données ont été calculées le ${formatDateAbsolue(aujourdhui)}`,
              type: 'string'
            }
          ],
          [
            {
              value: `Mail de la personne concernée : ${email}`,
              type: 'string'
            }
          ],
        ]
    ],
    [
        'Évènements',
        [...headerÉvènements, ...évènementsFormattésPourODS]
    ],
    [
        "Évènements avec count",
        [...headerÉvènementsCount, ...évènementCountsFormattésPourODS]
    ]
])

/** @type {ArrayBuffer} */
const ods = await createOdsFile(content)

const nomDuFichier = `donnees-aarri${(prénom!='' || nom!=='') ? `-${prénom}-${nom}` : ''}-${formatDateAbsolue(aujourdhui,'dd-MM-yyyy')}.ods`

async function créerFichierODS() {
  try {
    console.log('📝 Création du fichier ODS avec les résultats...')
    await writeFile(`./${nomDuFichier}`, Buffer.from(ods));
    console.log(`✅ Le fichier ${nomDuFichier} a bien été créé !`)
  } catch (err) {
    console.log(err);
  }
}
await créerFichierODS();

process.exit(0)