//@ts-check

import path from 'node:path'

import Fastify from 'fastify'
import fastatic from '@fastify/static'

const fastify = Fastify({logger: true})

const PORT = parseInt(process.env.PORT || '')

if(!PORT){
    throw new TypeError(`Variable d'environnement PORT manquante`)
}

fastify.register(fastatic, {
    root: path.resolve(import.meta.dirname, '..', '..'),
    extensions: ['html']
})

// Declare a route
/*fastify.get('/', async function handler (request, reply) {
  return { hello: 'world' }
})*/

// Run the server!
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log('Server started! Listening to port', PORT)
} catch (err) {
  console.error(err)
  process.exit(1)
}