//@ts-check

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'

import créerPremièrePersonne from './créer-première-personne.js'

import { getPersonneByCode, getAllDossier } from './database.js'

const PORT = parseInt(process.env.PORT || '')
if(!PORT){
  throw new TypeError(`Variable d'environnement PORT manquante`)
}

const API_TOKEN = process.env.API_TOKEN
if(!API_TOKEN){
  throw new TypeError(`Variable d'environnement API_TOKEN manquante`)
}

const DEMARCHE_NUMBER = process.env.DEMARCHE_NUMBER
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}


const fastify = Fastify({logger: true})

fastify.register(fastatic, {
  root: path.resolve(import.meta.dirname, '..', '..'),
  extensions: ['html']
})
fastify.get('/saisie-especes', (request, reply) => {
  reply.sendFile('index.html')
})

créerPremièrePersonne()

// Privileged routes
fastify.get('/dossiers', async function handler (request, reply) {
  // @ts-ignore
  const code_accès = request.query.secret
  if (code_accès) {
    const personne = await getPersonneByCode(code_accès)
    if (personne) {
      return getAllDossier()
    } else {
      reply.code(403).send("Code d'accès non valide.")
    }
  } else {
    reply.code(400).send("Paramètre secret manquant dans l'URL.")
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