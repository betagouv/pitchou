//@ts-check

/** @import {RouteShorthandOptions} from 'fastify' */

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'
import fastifyCompress from '@fastify/compress'
import fastifyMultipart from '@fastify/multipart'


import { closeDatabaseConnection,
  getInstructeurCapBundleByPersonneCodeAccès, getRelationSuivis,
  getRésultatsSynchronisationDS88444,
  créerTransaction} from './database.js'

import { dossiersAccessibleViaCap, getDossierComplet, getDossierMessages, getDossiersRésumésByCap, getÉvènementsPhaseDossiers, updateDossier } from './database/dossier.js'
import { créerPersonneOuMettreÀJourCodeAccès, getPersonneByDossierCap, getPersonneByEmail } from './database/personne.js'

import { modifierDécisionAdministrative, supprimerDécisionAdministrative, ajouterDécisionAdministrativeAvecFichier } from './database/décision_administrative.js'
import { ajouterPrescription, modifierPrescription, supprimerPrescription, ajouterPrescriptionsEtContrôles } from './database/prescription.js'
import { ajouterContrôles, modifierContrôle, supprimerContrôle } from './database/controle.js'
import {getFichier} from './database/fichier.js'
import { getStatsPubliques } from './database/stats.js'

import { authorizedEmailDomains } from '../commun/constantes.js'
import { envoyerEmailConnexion } from './emails.js'
import { demanderLienPréremplissage } from './démarche-numérique/demanderLienPréremplissage.js'

import _schema88444 from '../../data/démarche-numérique/schema-DS/derogation-especes-protegees.json' with {type: 'json'}
import { chiffrerDonnéesSupplémentairesDossiers } from './démarche-numérique/chiffrerDéchiffrerDonnéesSupplémentaires.js'
import {instructeurLaisseDossier, instructeurSuitDossier, trouverRelationPersonneDepuisCap} from './database/relation_suivi.js'
import { créerÉvènementMétrique } from './évènements_métriques.js'
import { indicateursAARRI } from './database/aarri.js'
import { ajouterOuModifierAvisExpert, ajouterOuModifierAvisExpertAvecFichiers, supprimerAvisExpert } from './database/avis_expert.js'
import {miseEnPlaceSecretGeoMCE, verifierSecretGeoMCE} from './database/capability-geomce.js'
import {générerDéclarationGeoMCE} from './database/geomce.js'
import { getNotificationsPourPersonneDepuisCap } from './database/notification.js'


/** @import {DossierDemarcheNumerique88444} from '../types/démarche-numérique/Démarche88444.js' */
/** @import {SchemaDémarcheSimplifiée} from '../types/démarche-numérique/schema.js' */
/** @import {IdentitéInstructeurPitchou, PitchouInstructeurCapabilities} from '../types/capabilities.js' */
/** @import {StringValues,PickNonNullable} from '../types/tools.ts' */
/** @import {default as Personne} from '../types/database/public/Personne.ts' */
/** @import {default as Prescription} from '../types/database/public/Prescription.ts' */
/** @import {default as DécisionAdministrative} from '../types/database/public/DécisionAdministrative.ts' */
/** @import {default as Contrôle} from '../types/database/public/Contrôle.ts' */
/** @import {DossierComplet, DécisionAdministrativePourTransfer, FrontEndPrescription} from '../types/API_Pitchou.ts' */
/** @import Fichier from '../types/database/public/Fichier.ts' */


/** @type {SchemaDémarcheSimplifiée} */
// @ts-expect-error TS ne peut pas le savoir
const schema88444 = _schema88444


const PORT = parseInt(process.env.PORT || '')
if(!PORT){
  throw new TypeError(`Variable d'environnement PORT manquante`)
}

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

console.log('NODE_ENV', process.env.NODE_ENV)


const ONE_MB = 1048576
// certaines routes permettent des upload de fichier
// ces routes partagent une taille maximale d'upload
const MAX_UPLOAD_FILE_SIZE = 20*ONE_MB


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
    fileSize: 20_000_000,  // For multipart forms, the max file size in bytes
    files: 2,           // Max number of file fields
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

fastify.get('/tous-les-dossiers', sendIndexHTMLFile)
fastify.get('/mes-dossiers', sendIndexHTMLFile)
fastify.get('/saisie-especes', sendIndexHTMLFile)
// fastify.get('/dossier/:dossierId', sendIndexHTMLFile) géré plus bas avec une route dédiée qui peut retourner aussi du JSON
fastify.get('/preremplissage-derogation', sendIndexHTMLFile)
fastify.get('/tmp/stats', sendIndexHTMLFile)
fastify.get('/stats', sendIndexHTMLFile)
fastify.get('/import-dossier-historique/bourgogne-franche-comte', sendIndexHTMLFile)
fastify.get('/import-dossier-historique/corse', sendIndexHTMLFile)
fastify.get('/accessibilite', sendIndexHTMLFile)
fastify.get('/donnees-personnelles', sendIndexHTMLFile)
fastify.get('/aarri', sendIndexHTMLFile)



fastify.post('/lien-preremplissage', async function (request) {
  /** @type {Partial<DossierDemarcheNumerique88444>} */
  // @ts-ignore
  let donnéesPreRemplissage = request.body

  const donnéesSupplémentairesDossiers = donnéesPreRemplissage['NE PAS MODIFIER - Données techniques associées à votre dossier']

  // Les données supplémentaires concernent les données des annotations privées, les données de suivi des instructeur.i.ces...
  // Ces données ne peuvent pas être pré-remplies directement, on va donc les chiffrer pour les utiliser plus tard.
  if (donnéesSupplémentairesDossiers) {
    donnéesPreRemplissage['NE PAS MODIFIER - Données techniques associées à votre dossier'] = await chiffrerDonnéesSupplémentairesDossiers(donnéesSupplémentairesDossiers)
  }

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


fastify.get('/api/stats-publiques', async function () {
  return getStatsPubliques()
})

fastify.get('/api/aarri', async function () {
  return indicateursAARRI()
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
  if(capBundle.modifierRelationSuivi){
    ret.modifierRelationSuivi = `/dossiers/relation-suivis?cap=${capBundle.modifierRelationSuivi}`
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
  if(capBundle.modifierDécisionAdministrativeDansDossier){
    ret.modifierDécisionAdministrativeDansDossier = `/decision-administrative?cap=${capBundle.modifierDécisionAdministrativeDansDossier}`
  }
  if (capBundle.créerÉvènementMetrique) {
    ret.créerÉvènementMetrique = `/api/métriques/évènements?cap=${capBundle.créerÉvènementMetrique}`
  }
  if(capBundle.identité){
    ret.identité = capBundle.identité
  }
  if(capBundle.listerNotifications){
    ret.listerNotifications = `/dossiers/notifications?cap=${capBundle.listerNotifications}`
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
    return dossiers
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


//@ts-expect-error Fastify type is hard to get
async function téléchargementFichierRouteHandler(request, reply) {

  //@ts-ignore
  if(!request.params.fichierId){
    reply.code(400).send(`Paramètre 'fichierId' manquant dans l'URL`)
    return
  }

  //@ts-ignore
  const fichierId = request.params.fichierId

  const fichier = await getFichier(fichierId)

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
}

fastify.get('/piece-jointe-petitionnaire/fichier/:fichierId', téléchargementFichierRouteHandler)
fastify.get('/especes-impactees/:fichierId', téléchargementFichierRouteHandler)
fastify.get('/decision-administrative/fichier/:fichierId', téléchargementFichierRouteHandler)
fastify.get('/avis-expert/fichier/:fichierId', téléchargementFichierRouteHandler)


fastify.post(
  '/decision-administrative',
  {bodyLimit: MAX_UPLOAD_FILE_SIZE},
  async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return
  }

  /** @type { DécisionAdministrativePourTransfer } */
  // @ts-ignore
  const décisionData = request.body

  if(!décisionData.dossier){
    reply.code(400).send(`Le 'dossier' est absent des données de décision administrative`)
    return
  }


  let ret;

  const transaction = await créerTransaction()

  const dossiersAccessibles = await dossiersAccessibleViaCap(décisionData.dossier, cap, transaction)
  if(!dossiersAccessibles.has(décisionData.dossier)){
    reply.code(400).send(`La capability ${cap} ne permet pas d'avoir accès au dossier ${décisionData.dossier}`)
    transaction.rollback()
    return;
  }


  if(décisionData.id){
    ret = modifierDécisionAdministrative(décisionData, transaction)
  }
  else{
    ret = ajouterDécisionAdministrativeAvecFichier(décisionData, transaction)
  }

  return ret
    .then(id => transaction.commit().then(() => id))
    .then((/** @type {DécisionAdministrative['id'] | undefined} */ décisionId) => {
        reply.send(décisionId)
    })
    .catch((/** @type {any} */ err) => {transaction.rollback(); throw err})
    .catch((/** @type {any} */ err) => {
        reply.code(500).send(`Erreur lors de l'ajout/modification de prescription. ${err}`)
    })
})


fastify.delete('/decision-administrative/:decisionAdministrativeId', async function(request, reply) {
  //@ts-ignore
  if(!request.params.decisionAdministrativeId){
    reply.code(400).send(`Paramètre 'decisionAdministrativeId' manquant dans l'URL`)
    return
  }

  // @ts-ignore
  return supprimerDécisionAdministrative(request.params.decisionAdministrativeId)
})



fastify.post('/prescription', function(request, reply) {
  /** @type { Partial<Prescription> } */
  // @ts-ignore
  const prescriptionData = request.body

  let ret;

  if(prescriptionData.id){
    ret = modifierPrescription(prescriptionData)
  }
  else{
    ret = ajouterPrescription(prescriptionData)
  }

  return ret.then((/** @type {Prescription['id'] | undefined} */ prescriptionId) => {
      reply.send(prescriptionId)
    })
    .catch((/** @type {any} */ err) => {
      reply.code(500).send(`Erreur lors de l'ajout/modification de prescription. ${err}`)
    })
})


fastify.post('/prescriptions-et-contrôles', function(request, reply) {
  /** @type { Omit<FrontEndPrescription, 'id'>[] } */
  // @ts-ignore
  const prescriptionData = request.body

  return ajouterPrescriptionsEtContrôles(prescriptionData)
    .then(() => { reply.send('') })
    .catch((/** @type {any} */ err) => {
      reply.code(400).send(`Erreur lors de l'ajout/modification de prescription. ${err}`)
    })
})



fastify.delete('/prescription/:prescriptionId', async function(request, reply) {
  //@ts-ignore
  if(!request.params.prescriptionId){
    reply.code(400).send(`Paramètre 'prescriptionId' manquant dans l'URL`)
    return
  }

  // @ts-ignore
  return supprimerPrescription(request.params.prescriptionId)
})


fastify.post('/contrôle', function(request, reply) {
  /** @type { Partial<Contrôle> } */
  // @ts-ignore
  const contrôleData = request.body

  let ret;

  if(contrôleData.id){
    ret = modifierContrôle(contrôleData)
  }
  else{
    ret = ajouterContrôles(contrôleData)
  }

  return ret.then((/** @type {Contrôle['id'] | undefined} */ contrôleId) => {
      reply.send(contrôleId)
    })
    .catch((/** @type {any} */ err) => {
      reply.code(500).send(`Erreur lors de l'ajout/modification de contrôle. ${err}`)
    })
})


fastify.delete('/contrôle/:contrôleId', async function(request, reply) {
  //@ts-ignore
  if(!request.params.contrôleId){
    reply.code(400).send(`Paramètre 'contrôleId' manquant dans l'URL`)
    return
  }

  // @ts-ignore
  return supprimerContrôle(request.params.contrôleId)
})




fastify.post('/avis-expert', {
  schema: {
    consumes: ['multipart/form-data'],
    body: {
      type: 'object',
      required: ['dossier'],
      properties: 
        {
          body : {
            type: 'object',
                  properties: 
                    {
                      dossier: {
                        type: 'string',
                      },
                      id: {
                        type: 'string',
                      },
                      expert: {
                        type: 'string'
                      },
                      avis: {
                        type: 'string',
                      },
                      date_avis: {
                        type: 'string',
                      },
                      date_saisine: {
                        type: 'string',
                      }
                    }
                },
          blobFichierSaisine: {
            type: 'object',
          },
          blobFichierAvis: {
            type: 'object',
          },
        }
    }
  }
}, async function (req) {
  // Récupérer les données du corps de la requête
  /** @type {any} */
  const body = req.body

  const dossier = JSON.parse(body.dossier.value);
  const id = body.id ? body.id.value : undefined;
  const expert = body.expert ? body.expert.value : undefined
  const avis = body.avis ? body.avis.value : undefined
  
  const date_saisine = body['date_saisine'] ? new Date(body['date_saisine'].value) : undefined
  const date_avis = body['date_avis'] ? new Date(body['date_avis'].value) : undefined

  const avisExpert = { dossier, id, expert, avis, date_avis, date_saisine }

  // Récupérer les fichiers d'avis et de saisine
  /** @type { PickNonNullable<Fichier, 'nom' | 'contenu' | 'media_type'> | undefined} */
  let fichierSaisine
  /** @type { PickNonNullable<Fichier, 'nom' | 'contenu' | 'media_type'>| undefined} */
  let fichierAvis

  const [blobFichierSaisineContenu, blobFichierAvisContenu] = await Promise.all(['blobFichierSaisine' in body ? await body.blobFichierSaisine.toBuffer() : Promise.resolve([]),
  'blobFichierAvis' in body ? await body.blobFichierAvis.toBuffer() : Promise.resolve([])
])

  if ('blobFichierSaisine' in body) {
    /** @type {any} */
    const blobFichierSaisine = body.blobFichierSaisine
    fichierSaisine = {nom: blobFichierSaisine.filename, media_type: blobFichierSaisine.mimetype, contenu: blobFichierSaisineContenu}
  }
  if ('blobFichierAvis' in body) {
    /** @type {any} */
    const blobFichierAvis = body.blobFichierAvis
    fichierAvis = {nom: blobFichierAvis.filename, media_type: blobFichierAvis.mimetype, contenu: blobFichierAvisContenu}
  } 

  if (fichierAvis || fichierSaisine) {
    return ajouterOuModifierAvisExpertAvecFichiers(avisExpert, fichierSaisine, fichierAvis)
  } else {
    return ajouterOuModifierAvisExpert(avisExpert)
  }
})



/**
 * @type {RouteShorthandOptions}
 * @const
 */
const optsAvisExpertDelete = {
  schema: {
    params: {
      type: 'object',
      properties: {
        avisExpertId: {
          type: 'string',
          minLength: 2
        },
      },
      required: ['avisExpertId'],
    },
  },
};

fastify.delete('/avis-expert/:avisExpertId', optsAvisExpertDelete ,function(request) {
  //@ts-ignore
  const {avisExpertId} = request.params

  return supprimerAvisExpert(avisExpertId)
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

/**
 * @type {RouteShorthandOptions}
 * @const
 */
const optsNotificationsGet = {
  schema: {
    querystring: {
      type: 'object',
      required: ['cap'],
      properties: {
        cap: { type: 'string' },
      },
    },
  },
};
fastify.get('/dossiers/notifications', optsNotificationsGet, async function(request) {
  // @ts-ignore
  const { cap } = request.query
  const notifications = await getNotificationsPourPersonneDepuisCap(cap)
  return notifications
})


fastify.post('/dossiers/relation-suivis', async function(request, reply) {
  // @ts-ignore
  const { cap } = request.query

  if(!cap){
    reply.code(400).send(`Paramètre 'cap' manquant dans l'URL`)
    return
  }

  /** @typedef {Parameters<PitchouInstructeurCapabilities['modifierRelationSuivi']>} ChangerSuiviParams */

  /** @type { {direction: ChangerSuiviParams[0], personneEmail: ChangerSuiviParams[1], dossierId: ChangerSuiviParams[2]} } */
  // @ts-ignore
  const {direction, personneEmail, dossierId} = request.body

  const transaction = await créerTransaction()

  const relationsSuiviViaCap = await trouverRelationPersonneDepuisCap(cap, personneEmail, dossierId, transaction)

  if(relationsSuiviViaCap.length === 0){
    reply.code(403).send(`La capability ${cap} ne permet pas de modifier la relation de suivi entre instructeur.rice ${personneEmail} et dossier ${dossierId}`)
    transaction.rollback()
    return;
  }

  const personne = await getPersonneByEmail(personneEmail, transaction)

  if(!personne){
      reply.code(400).send(`Pas de personne avec l'adresse email ${personneEmail}`)
      transaction.rollback()
      return;
  }

  const personneId = personne.id

  let ret;

  if(direction === 'suivre'){
    ret = instructeurSuitDossier(personneId, dossierId, transaction)
  }
  else{
    if(direction !== 'laisser'){
      reply.code(500).send(`Erreur lors du changement de suivi du dossier. Direction ${direction} non reconnue.`)
      return
    }

    ret = instructeurLaisseDossier(personneId, dossierId, transaction)
  }

  return ret
      .then(() => transaction.commit())
      .then(() => reply.send())
      .catch((/** @type {any} */ err) => {transaction.rollback(); throw err})
      .catch((/** @type {any} */ err) => {
          reply.code(500).send(`Erreur lors du changement de suivi du dossier ${dossierId} par ${personneEmail}. ${err}`)
      })
})

fastify.post('/api/métriques/évènements', créerÉvènementMétrique)


miseEnPlaceSecretGeoMCE()

fastify.get('/declaration-geomce', async function(request, reply) {
  // @ts-ignore
  const { secret } = request.query

  if(!secret){
    reply.code(400).send(`Paramètre 'secret' manquant dans l'URL`)
    return
  }

  try{
    await verifierSecretGeoMCE(secret)
  }
  catch(e){
    reply.code(403).send(`Le paramètre 'secret' est invalide. Contacter l'équipe Pitchou pour comprendre de quoi il retourne`)
    return
  }

  return générerDéclarationGeoMCE()
})


// Lancer le serveur HTTP
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Serveur démarré. En écoute sur le port`, PORT)
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
