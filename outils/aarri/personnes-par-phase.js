import { formatDateAbsolue } from '../../scripts/front-end/affichageDossier.js';
import { closeDatabaseConnection } from '../../scripts/server/database.js';
import { getPersonnesAcquisesAvecSemaine, getPersonnesActivesAvecSemaine, getPersonnesImpactAvecSemaine, getPersonnesRetenuesAvecSemaine } from '../../scripts/server/database/aarri/personnes-par-phase.js';

// Récupération des données
const personnesAcquises = await getPersonnesAcquisesAvecSemaine()
const personnesActives = await getPersonnesActivesAvecSemaine()
const personnesRetenues = await getPersonnesRetenuesAvecSemaine()
const personnesImpact = await getPersonnesImpactAvecSemaine()

const personnesAcquisesEmailParSemaine = new Map(personnesAcquises.map(({email, semaine}) => [email, semaine]))
const personnesActivesEmailParSemaine = new Map(personnesActives.map(({email, semaine}) => [email, semaine]))
const personnesRetenuesEmailParSemaine = new Map(personnesRetenues.map(({email, semaine}) => [email, semaine]))
const personnesImpactEmailParSemaine = new Map(personnesImpact.map(({email, semaine}) => [email, semaine]))
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
    value: "Date de l'entrée dans la phase Rétention",
    type: 'string'
  },
  {
    value: "Date de l'entrée dans la phase Impact",
    type: 'string'
  },
]]

const personnes = [... new Set([...personnesAcquisesEmailParSemaine.keys(), ...personnesActivesEmailParSemaine.keys()])]

const lignes = personnes.map(( email ) => {
  const dateAcquis = personnesAcquisesEmailParSemaine.get(email)
  const dateActive = personnesActivesEmailParSemaine.get(email)
  const dateRetenue = personnesRetenuesEmailParSemaine.get(email)
  const dateImpact = personnesImpactEmailParSemaine.get(email)
  if (dateAcquis || dateActive) {
    return (
        [
            {
              value: email,
              type: 'string'
            }, 
            {
              value: dateAcquis ? true : false, // La date d'acquisition n'est pas forcément cohérente (parfois elle est antérieure à la date d'activation). C'est dû à notre ancienne façon de mesurer l'évènement "seConnecter".
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

console.log('content', content)

closeDatabaseConnection()