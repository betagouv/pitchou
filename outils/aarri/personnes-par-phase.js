import {createOdsFile} from '@odfjs/odfjs'
import { formatDateAbsolue } from '../../scripts/front-end/affichageDossier.js';
import { closeDatabaseConnection } from '../../scripts/server/database.js';
import { writeFile } from 'node:fs/promises'
import { getPersonnesAcquisesParDate, getPersonnesActives } from '../../scripts/server/database/aarri/personnes-par-phase.js';

// Récupération des données
const personnesAcquises = await getPersonnesAcquisesParDate()
const personnesActives = await getPersonnesActives()

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

const personnes = [...personnesAcquises.keys()]

const personnesActivesTrié = personnesActives.sort((a, b) => a.date < b.date ? 1 : -1)

const lignesAcquis = personnes.map(( personne ) => {
  const dateAcquis = personnesAcquises.get(personne)
  if (dateAcquis) {
    return (
        [
            {
              value: personne.email,
              type: 'string'
            }, 
            {
              value: formatDateAbsolue(dateAcquis, 'dd/MM/yyyy'),
              type: 'string'
            },
        ]
    )
  } else {
    return []
  }
});

const lignesActivé = personnesActivesTrié.map( ({ email, date } ) => ([
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
        'Personnes acquises',
        [...entête, ...lignesAcquis]
    ],
    [
      'Personnes actives',
      lignesActivé
    ]
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