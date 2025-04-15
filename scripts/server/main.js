//@ts-check

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'
import fastifyCompress from '@fastify/compress'
import fastifyMultipart from '@fastify/multipart'
import AdmZip from 'adm-zip'

import {tableRawContentToObjects, tableWithoutEmptyRows, getODSTableRawContent} from '@odfjs/odfjs'

import { closeDatabaseConnection, getInstructeurIdByÉcritureAnnotationCap, 
  getInstructeurCapBundleByPersonneCodeAccès, getRelationSuivis,
  getRésultatsSynchronisationDS88444} from './database.js'

import { dossiersAccessibleViaCap, getDossierComplet, getDossierMessages, getDossiersRésumésByCap, getFichierEspècesImpactées, getÉvènementsPhaseDossiers, updateDossier } from './database/dossier.js'
import { créerPersonneOuMettreÀJourCodeAccès, getPersonneByDossierCap } from './database/personne.js'

import { authorizedEmailDomains } from '../commun/constantes.js'
import { envoyerEmailConnexion } from './emails.js'
import { demanderLienPréremplissage } from './démarches-simplifiées/demanderLienPréremplissage.js'

import remplirAnnotations from './démarches-simplifiées/remplirAnnotations.js'

import synchronisationComplèteSiNécessaire from './synchro-complète-si nécessaire.js'

/** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444} from '../types/démarches-simplifiées/DémarcheSimplifiée88444.js' */
/** @import {SchemaDémarcheSimplifiée} from '../types/démarches-simplifiées/schema.js' */
/** @import {IdentitéInstructeurPitchou, PitchouInstructeurCapabilities} from '../types/capabilities.js' */
/** @import {StringValues} from '../types/tools.ts' */
/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {DossierComplet} from '../types/API_Pitchou.ts' */

import _schema88444 from '../../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}
import générerFichier from './générerFichierDepuisTemplate.js'

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

await fastify.register(fastifyCompress)

fastify.register(fastatic, {
  root: path.resolve(import.meta.dirname, '..', '..'),
  extensions: ['html']
})

fastify.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: {
    fieldNameSize: 100, // Max field name size in bytes
    fieldSize: 100,     // Max field value size in bytes
    fields: 10,         // Max number of non-file fields
    fileSize: 1000000,  // For multipart forms, the max file size in bytes
    files: 5,           // Max number of file fields
    headerPairs: 2000,  // Max number of header key=>value pairs
    parts: 1000         // For multipart forms, the max number of parts (fields + files)
  }
})


/**
 * 
 * @param {any} _request 
 * @param {any} reply 
 */
function sendIndexHTMLFile(_request, reply){
  reply.sendFile('index.html')
}

fastify.get('/saisie-especes', sendIndexHTMLFile)
// fastify.get('/dossier/:dossierId', sendIndexHTMLFile) géré plus bas avec une route dédiée qui peut retourner aussi du JSON
fastify.get('/import-historique/nouvelle-aquitaine', sendIndexHTMLFile)
fastify.get('/preremplissage-derogation', sendIndexHTMLFile)
fastify.get('/tmp/stats', sendIndexHTMLFile)



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



fastify.get('/résultats-synchronisation', async function () {
  return getRésultatsSynchronisationDS88444()
})




/**
 * Routes qui nécessite des privilèges 
 */


fastify.get('/caps', async function (request, reply) {
  /** @type {Personne['code_accès']} */
  // @ts-ignore
  const code_accès = request.query.secret
  if(!code_accès) {
    return reply.code(400).send(`Paramètre 'secret' manquant dans l'URL`)
  }

  const capBundle = await getInstructeurCapBundleByPersonneCodeAccès(code_accès)

  /** @type {StringValues<PitchouInstructeurCapabilities> & {identité: IdentitéInstructeurPitchou}} */
  const ret = Object.create(null)

  if(capBundle.listerDossiers){
    ret.listerDossiers = `/dossiers?cap=${capBundle.listerDossiers}`
  }
  if(capBundle.recupérerDossierComplet){
    ret.recupérerDossierComplet = `/dossier/:dossierId?cap=${capBundle.recupérerDossierComplet}`
  }
  if(capBundle.listerRelationSuivi){
    ret.listerRelationSuivi = `/dossiers/relation-suivis?cap=${capBundle.listerRelationSuivi}`
  }
  if(capBundle.listerÉvènementsPhaseDossier){
    ret.listerÉvènementsPhaseDossier = `/dossiers/evenements-phases?cap=${capBundle.listerÉvènementsPhaseDossier}`
  }
  if(capBundle.listerMessages){
    ret.listerMessages = `/dossier/:dossierId/messages?cap=${capBundle.listerMessages}`
  }
  if(capBundle.modifierDossier){
    ret.modifierDossier = `/dossier/:dossierId?cap=${capBundle.modifierDossier}`
  }
  if(capBundle.remplirAnnotations){
    ret.remplirAnnotations = `/remplir-annotations?cap=${capBundle.remplirAnnotations}`
  }
  if(capBundle.identité){
    ret.identité = capBundle.identité
  }


  if(Object.keys(ret).length === 0){
    return reply.code(403).send("Code d'accès non valide.")
  }

  return ret
})


fastify.get('/dossiers', async function (request, reply) {
  // @ts-ignore
  const cap = request.query.cap
  if (cap) {
    /** @type {Awaited<ReturnType<NonNullable<PitchouInstructeurCapabilities['listerDossiers']>>>} */
    const dossiers = await getDossiersRésumésByCap(cap)
    if (dossiers && dossiers.length >= 1) {
      return dossiers
    } else {
      reply.code(403).send("Code d'accès non valide.")
    }
  } else {
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
  }
})

// Cette fonction ne peut pas être async parce que ça donne l'impression à fastify
// qu'elle répond 2 fois
fastify.get('/dossier/:dossierId', function(request, reply) {
  // console.log(`fastify.get('/dossier/:dossierId'`)
  const accept = request.headers.accept

  if(accept !== 'application/json'){
    sendIndexHTMLFile(request, reply)
  }
  else{
    // accept === 'application/json'
    // @ts-ignore
    const { cap } = request.query

    if(!cap){
      reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
      return 
    }
    
    //@ts-ignore
    if(!request.params.dossierId){
      reply.code(400).send(`Paramètre 'dossierId' manquant dans l'URL`)
      return 
    }

    /** @type {DossierComplet['id']} */
    //@ts-ignore
    const dossierId = Number(request.params.dossierId)

    /** @type {ReturnType<PitchouInstructeurCapabilities['recupérerDossierComplet']> | Promise<undefined>} */
    // @ts-ignore
    const dossierP = getDossierComplet(dossierId, cap)

    return dossierP.then(dossier =>{
      if(!dossier){
        reply.code(403).send(`Aucun dossier trouvé avec id '${dossierId}'`)
      }
      else{
        if(dossier.espècesImpactées && dossier.espècesImpactées.contenu){
          // change le Buffer en string base64 avant le transfert en JSON
          // @ts-ignore
          dossier.espècesImpactées.contenu = dossier.espècesImpactées.contenu.toString('base64')
        }
        
        return dossier
      }
    })
  }

})


fastify.post('/dossier/:dossierId', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }
  
  //@ts-ignore
  if(!request.params.dossierId){
    reply.code(400).send(`Paramètre 'dossierId' manquant dans l'URL`)
    return 
  }

  /** @type {DossierComplet['id']} */
  //@ts-ignore
  const dossierId = Number(request.params.dossierId)

  // @ts-ignore
  const accessibleDossierId = await dossiersAccessibleViaCap(dossierId, cap)

  if(!accessibleDossierId.has(dossierId)){
    reply.code(403).send(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`)
    return 
  }

  const capPersonne = await getPersonneByDossierCap(cap)

  /** @type {Partial<DossierComplet>} */
  // @ts-ignore
  const dossierParams = request.body

  // @ts-ignore
  return updateDossier(dossierId, dossierParams, capPersonne.id)
})

fastify.get('/especes-impactees/:fichierId', async function(request, reply) {
  
  //@ts-ignore
  if(!request.params.fichierId){
    reply.code(400).send(`Paramètre 'fichierId' manquant dans l'URL`)
    return 
  }

  //@ts-ignore
  const fichierId = request.params.fichierId

  const fichier = await getFichierEspècesImpactées(fichierId)

  if(!fichier){
    reply.code(404).send('Fichier non trouvé')
    return
  }
  else{
    reply
      .header('content-disposition', `attachment; filename="${fichier.nom}"`)
      .header('content-type', fichier.media_type)
      .send(fichier.contenu)
  }
})


fastify.get('/dossier/:dossierId/messages', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }
  
  //@ts-ignore
  if(!request.params.dossierId){
    reply.code(400).send(`Paramètre 'dossierId' manquant dans l'URL`)
    return 
  }

  /** @type {DossierComplet['id']} */
  //@ts-ignore
  const dossierId = Number(request.params.dossierId)

  // @ts-ignore
  const accessibleDossierId = await dossiersAccessibleViaCap(dossierId, cap)

  if(!accessibleDossierId.has(dossierId)){
    reply.code(403).send(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`)
    return 
  }

  // @ts-ignore
  return getDossierMessages(dossierId)
})

fastify.get('/dossiers/evenements-phases', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }

  const évènementsPhase = await getÉvènementsPhaseDossiers(cap)
  if (!évènementsPhase) {
    reply.code(403).send(`Le paramètre 'cap' est invalide`)
    return
  } 

  return évènementsPhase
})

fastify.get('/dossiers/relation-suivis', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }

  const relationSuivis = await getRelationSuivis(cap)
  if (!relationSuivis) {
    reply.code(403).send(`Le paramètre 'cap' est invalide`)
    return
  } 

  return relationSuivis
})



fastify.post('/remplir-annotations', async (request, reply) => {
  // @ts-ignore
  const cap = request.query.cap
  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return 
  }
  else{
    const instructeurId = await getInstructeurIdByÉcritureAnnotationCap(cap)
    if (!instructeurId) {
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
        { dossierId, instructeurId, annotations }
      )
    }
  }
})



 
fastify.get('/prototype/generation-fichier', sendIndexHTMLFile)

fastify.post('/prototype/generer-fichier', async (request, reply) => {
    const formData = await request.formData()
    
    /** @type {FormDataEntryValue | null} */
    const templateFile = formData.get('template')
    if(!templateFile){
        reply.code(400).send(`Fichier template manquant`)
        return
    }
    if(typeof templateFile === 'string'){
        reply.code(400).send(`La valeur 'template' devrait être un fichier`)
        return
    }

    const dataFile = formData.get('data')
    if(!dataFile){
        reply.code(400).send(`Données manquantes`)
        return
    }
    if(typeof dataFile === 'string'){
        reply.code(400).send(`La valeur 'data' devrait être un fichier`)
        return
    }

    const template = Buffer.from(await templateFile.arrayBuffer())
    const données = await getODSTableRawContent(await dataFile.arrayBuffer())
        .then(tableWithoutEmptyRows)
        .then(tableRawContentToObjects)
        // suppose une feuille unique
        // @ts-ignore
        .then(tableObjects => tableObjects.values().next().value)

    return Promise.all(
        // @ts-ignore
        données.map(({nomFichier, ...rest}) => {
            return générerFichier(template, rest)
              .then(contenu => { return {nomFichier, contenu} })
        })
    )
    .then(fichiers => {
        const zip = new AdmZip();

        for(const {nomFichier, contenu} of fichiers){
            zip.addFile(`${nomFichier}.odt`, contenu);
        }
        
        return zip.toBuffer();
    })

})



// Lancer le serveur HTTP
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Serveur démarré. En écoute sur le port`, PORT)
} catch (err) {
  console.error(err)
  process.exit(1)
}

// la synchronisation complète a lieu après le lancement du serveur
synchronisationComplèteSiNécessaire()



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


