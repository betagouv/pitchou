//@ts-check
import parseArgs from 'minimist'
import { getÉvènementsForPersonne } from '../../scripts/server/database/aarri/utils.js';
import {createOdsFile} from '@odfjs/odfjs'
import { formatDateAbsolue } from '../../scripts/front-end/affichageDossier.js';
import { closeDatabaseConnection } from '../../scripts/server/database.js';
import { writeFile, mkdir } from 'node:fs/promises'

const args = parseArgs(process.argv)

let origin = 'https://pitchou.beta.gouv.fr'

if(args.origin)
    origin = args.origin

if (!args.email) {
    console.error(`Il manque le paramètre --email`);
    process.exit(1)
}

const email = args.email

console.log(`Mail de la personne concernée : ${email}`)
console.log(`Début des Calculs des données AARRI.`)

const évènements = await getÉvènementsForPersonne(email)
const évènementsCount = Map.groupBy(évènements, ({ évènement }) => évènement )

console.log(`✅ Résultats :`)
console.log('Cette personne a enregistré', évènements.length,'évènements depuis le',`${formatDateAbsolue(évènements.at(-1)?.date)}`)

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
const évènementCountsFormattésPourODS = [...évènementsCount].map( ([ nomÉvènement, évènements ]) => ([
    {
      value: nomÉvènement,
      type: 'string'
    },
    {
      value: évènements.length,
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
const nomDeFichierODS = email+ Math.random().toString(36).slice(2) + '.ods'
const cheminDuFichierODS = `/tmp/pitchou/${nomDeFichierODS}`

try {
    console.log('📝 Création du fichier ODS avec les résultats...')
    await mkdir('/tmp/pitchou', { recursive: true })
    await writeFile(cheminDuFichierODS, Buffer.from(ods))
    console.log(`✅ Le fichier a bien été écrit dans ${cheminDuFichierODS}.`)
    const lienTéléchargementFichier = `${origin}/tmp/${nomDeFichierODS}`
    console.log(`Télécharger le fichier en cliquant ici : ${lienTéléchargementFichier}`)

  } catch (err) {
    console.error(err);
}

closeDatabaseConnection()
