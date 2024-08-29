//@ts-check

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'

import { getPersonneByCode, listAllDossiersComplets, créerPersonneOuMettreÀJourCodeAccès, updateDossier, closeDatabaseConnection } from './database.js'

import { authorizedEmailDomains } from '../commun/constantes.js'
import { envoyerEmailConnexion } from './emails.js'
import { demanderLienPréremplissage } from './démarches-simplifiées/demanderLienPréremplissage.js'

import remplirAnnotations from './démarches-simplifiées/remplirAnnotations.js'

/** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444} from '../types/démarches-simplifiées/DémarcheSimplifiée88444.js' */
/** @import {SchemaDémarcheSimplifiée} from '../types/démarches-simplifiées/schema.js' */

import _schema88444 from '../../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}

/** @type {SchemaDémarcheSimplifiée} */
// @ts-expect-error TS ne peut pas le savoir
const schema88444 = _schema88444

const PORT = parseInt(process.env.PORT || '')
if(!PORT){
  throw new TypeError(`Variable d'environnement PORT manquante`)
}

const DEMARCHE_NUMBER = process.env.DEMARCHE_NUMBER
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

console.log('NODE_ENV', process.env.NODE_ENV)

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,req.remotePort,req.remoteAddress,req.hostname,reqId,req,res',
        messageFormat: '[{reqId}] {req.method} {req.url} {res.statusCode} {msg}',
        /*customPrettifiers: {
          responseTime: (value, key, log, { colors }) => {
            return `${value.toFixed(0)}ms`
          }
        }*/
      },
    }
  }
})

fastify.register(fastatic, {
  root: path.resolve(import.meta.dirname, '..', '..'),
  extensions: ['html']
})
fastify.get('/saisie-especes', (_request, reply) => {
  reply.sendFile('index.html')
})
fastify.get('/dossier/:dossierId', (_request, reply) => {
  reply.sendFile('index.html')
})
fastify.get('/import-historique/nouvelle-aquitaine', (_request, reply) => {
  reply.sendFile('index.html')
})
fastify.get('/preremplissage-derogation', (_request, reply) => {
  reply.sendFile('index.html')
})

fastify.post('/lien-preremplissage', async function (request) {
  /** @type {Partial<DossierDemarcheSimplifiee88444>} */
  // @ts-ignore
  const donnéesPreRemplissage = request.body

  return demanderLienPréremplissage(donnéesPreRemplissage, schema88444)
    // @ts-ignore
    .then(({dossier_url}) => dossier_url)
})


fastify.post('/envoi-email-connexion', async function (request, reply) {
  // @ts-ignore
  const email = decodeURIComponent(request.query.email)

  if(!email){
    return reply.code(400).send(`Paramètre 'email' manquant dans l'URL`)
  }

  const [_name, domain] = email.split('@')

  if(!authorizedEmailDomains.has(domain)){
    return reply.code(403).send(`Le domaine '${domain}' ne fait pas partie des domaines autorisés`)
  }
  else{
    // le domaine est autorisé
    return créerPersonneOuMettreÀJourCodeAccès(email)
    .then(codeAccès => {
      const lienConnexion = `${request.headers.origin}/?secret=${codeAccès}`
      return envoyerEmailConnexion(email, lienConnexion)
    })
    .then( () => reply.code(204).send() )
  }

})

/**
 * Routes qui nécessite des privilèges 
 */

fastify.get('/dossiers', async function (request, reply) {
  // @ts-ignore
  const code_accès = request.query.secret
  if (code_accès) {
    const personne = await getPersonneByCode(code_accès)
    if (personne) {
      return listAllDossiersComplets()
    } else {
      reply.code(403).send("Code d'accès non valide.")
    }
  } else {
    reply.code(400).send(`Paramètre 'secret' manquant dans l'URL`)
  }
})

fastify.put('/dossier/:dossierId', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }

  const personne = await getPersonneByCode(cap)
  if (!personne) {
    reply.code(403).send(`Le paramètre 'cap' est invalide`)
    return
  } 
  
  // @ts-ignore
  const { dossierId } = request.params
  // @ts-ignore
  const dossierParams = JSON.parse(request.body).dossierParams

  return updateDossier(dossierId, dossierParams)
})


fastify.post('/remplir-annotations', async (request, reply) => {
  // @ts-ignore
  const cap = request.query.cap
  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }
  else{
    const personne = await getPersonneByCode(cap)
    if (!personne) {
      reply.code(403).send(`Le paramètre 'cap' est invalide`)
      return
    } 
    else{
      /** @type { {dossierId: string, annotations: Partial<AnnotationsPriveesDemarcheSimplifiee88444>} } */
      // @ts-ignore
      const {dossierId, annotations} = request.body

      if(!dossierId){
        reply.code(400).send(`Donnée 'dossierId' manquante dans le body`)
        return
      }

      if(!annotations){
        reply.code(400).send(`Donnée 'annotations' manquante dans le body`)
        return
      }

      /** @type {(keyof AnnotationsPriveesDemarcheSimplifiee88444)[]} */
      const dateKeys = [
        'Date de réception DDEP', 
        'Date saisine CSRPN', 
        'Date saisine CNPN',
        'Date avis CNPN', 
        'Date avis CSRPN',
        "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP",
        "Date de début de la consultation du public ou enquête publique",
        "Date de signature de l'AP",
        "Date de l'AM"
      ]

      for(const k of dateKeys){
            if(annotations[k]){
                //@ts-expect-error TS ne peut pas savoir qu'on n'a sélectionner que les clefs pour des dates
                annotations[k] = new Date(annotations[k])
            }
      }

      return remplirAnnotations(
        DEMARCHE_SIMPLIFIEE_API_TOKEN,
        {
          dossierId, 
          // PPP : à dés-hardcoder https://github.com/betagouv/pitchou/issues/46
          instructeurId: `SW5zdHJ1Y3RldXItOTY3Mjk=`,
          annotations
        }
      )
    }
  }

})




// Run the server!
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log('Server started! Listening to port', PORT)
} catch (err) {
  console.error(err)
  process.exit(1)
}



/**
 * @param {string} signal
 */
async function shutdown(signal){
  console.log('shutdown on', signal)  
  await Promise.all([
    closeDatabaseConnection(),
    fastify.close()
  ])
  process.exit()
}


process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
