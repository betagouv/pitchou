import {createOdsFile} from '@odfjs/odfjs'
import { formatDateAbsolue } from '../../scripts/front-end/affichageDossier.js';
import { closeDatabaseConnection } from '../../scripts/server/database.js';
// import { writeFile } from 'node:fs/promises'
import { getPersonnesAcquises, getPersonnesActives, getPersonnesImpact, getPersonnesRetenues } from '../../scripts/server/database/aarri/personnes-par-phase.js';

// Récupération des données
const personnesAcquises = await getPersonnesAcquises()
const personnesActives = await getPersonnesActives()
const personnesRetenues = await getPersonnesRetenues()
const personnesImpact = await getPersonnesImpact()

const personnesAcquisesEmailParDate = new Map(personnesAcquises.map(({email, date}) => [email, date]))
const personnesActivesEmailParDate = new Map(personnesActives.map(({email, date}) => [email, date]))
const personnesImpactEmailParDate = new Map(personnesImpact.map(({email, date}) => [email, date]))
const personnesRetenuesEmailParSemaine = new Map(personnesRetenues.map(({email, semaine}) => [email, semaine]))
const entête = [[
  {
    value: "Email de la personne",
    type: 'string'
  },
  {
    value: "Acquise",
    type: 'string'
  },
  {
    value: "Date d'activation",
    type: 'string'
  },
  {
    value: "Date du premier jour de la semaine d'entrée dans la phase Rétention",
    type: 'string'
  },
  {
    value: "Date de l'entrée dans la phase Impact",
    type: 'string'
  },
]]

const personnes = [... new Set([...personnesAcquisesEmailParDate.keys(), ...personnesActivesEmailParDate.keys()])]

const lignes = personnes.map(( email ) => {
  const dateAcquis = personnesAcquisesEmailParDate.get(email)
  const dateActive = personnesActivesEmailParDate.get(email)
  const dateRetenue = personnesRetenuesEmailParSemaine.get(email)
  const dateImpact = personnesImpactEmailParDate.get(email)
  if (dateAcquis || dateActive) {
    return (
        [
            {
              value: email,
              type: 'string'
            }, 
            {
              value: dateAcquis ? true : false, // La date d'acquisition n'est pas forcément cohérente (parfois elle est antérieure à la date d'activation). C'est dû à notre ancienne façon de mesurer l'évènement "seConnecter". On décide donc de ne pas l'afficher.
              type: 'string'
            },
            {
              value: dateActive ? formatDateAbsolue(dateActive, 'dd/MM/yyyy') : undefined,
              type: 'string'
            },
            {
              value: dateRetenue ? formatDateAbsolue(dateRetenue, 'dd/MM/yyyy') : undefined,
              type: 'string'
            },
            {
              value: dateImpact ? formatDateAbsolue(dateImpact, 'dd/MM/yyyy') : undefined,
              type: 'string'
            },
        ]
    )
  } else {
    return []
  }
});


const content = new Map([
    [
        'Personnes par phase',
        [...entête, ...lignes]
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
    // await writeFile(cheminDuFichierODS, Buffer.from(ods))
    console.log(cheminDuFichierODS, ods)
    console.log('lignes', lignes)
    //TODO : donner le lien du téléchargement du fichier

  } catch (err) {
    console.error(err);
}

closeDatabaseConnection()