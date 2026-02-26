import {createOdsFile} from '@odfjs/odfjs'
import { formatDateAbsolue } from '../../scripts/front-end/affichageDossier.js';
import { closeDatabaseConnection } from '../../scripts/server/database.js';
import { writeFile } from 'node:fs/promises'
import { getPersonnesAcquises } from '../../scripts/server/database/aarri/personnes-par-phase.js';

// Récupération des données
const personnesAcquises = await getPersonnesAcquises()

const entête = [[
  {
    value: "Email de la personne",
    type: 'string'
  },
  {
    value: "Date d'acquisition",
    type: 'string'
  },
]]

const personnesAcquisesTrié = personnesAcquises.sort((a, b) => a.date < b.date ? 1 : -1)

const lignesAcquis = personnesAcquisesTrié.map( ({ email, date } ) => ([
    {
      value: email,
      type: 'string'
    }, 
    {
      value: formatDateAbsolue(date, 'dd/MM/yyyy'),
      type: 'string'
    },
]));

const content = new Map([
    [
        'Personnes par phase',
        [...entête, ...lignesAcquis]
    ],
])


// Écriture du fichier
/** @type {ArrayBuffer} */
const ods = await createOdsFile(content)
const nomDeFichierODS = Math.random().toString(36).slice(2) + '.ods'

//TODO: changer ce chemin pour mettre le chemin d'un dossier temporaire en dehors du repo de l'application.
const cheminDuFichierODS = `outils/aarri/tmp/${nomDeFichierODS}`

try {
    console.log('📝 Création du fichier ODS avec les résultats...')
    await writeFile(cheminDuFichierODS, Buffer.from(ods))
    console.log(`✅ Le fichier a bien été écrit dans ${cheminDuFichierODS}.`)
    //TODO : donner le lien du téléchargement du fichier

  } catch (err) {
    console.error(err);
}

closeDatabaseConnection()