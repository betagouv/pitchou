//@ts-check

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'
import knex from 'knex'

const fastify = Fastify({logger: true})

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


fastify.register(fastatic, {
  root: path.resolve(import.meta.dirname, '..', '..'),
  extensions: ['html']
})

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const database = knex({
    client: 'pg',
    connection: DATABASE_URL,
});

// Privileged routes
fastify.get('/dossiers', async function handler (request, reply) {
  return database('dossier')
  .select()
})

// Run the server!
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log('Server started! Listening to port', PORT)
} catch (err) {
  console.error(err)
  process.exit(1)
}