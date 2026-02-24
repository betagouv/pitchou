import fastifyStatic from '@fastify/static'
import path from 'path'

export const PREFIX_FICHIER_TEMPORAIRE = 'fichier-temporaire'

const env = process.env.NODE_ENV

if (!env) {
  console.error(`La variable d'environnement 'NODE_ENV' n'est pas définie.`);
  process.exit(1)
}


// Le type de Fastify est compliqué à écrire
// @ts-ignore
/**
 * Plugin permettant de servier les dossiers statiques contenant des fichiers que l'on souhaite télécharger.
 * 
 * @param {*} fastify 
 */
export default async function (fastify) {
  let tmpDir = ''
  
  if (env === 'development') {
    tmpDir = path.join(process.cwd(), 'outils', 'aarri', 'tmp')
  } else {
    tmpDir = path.join(process.cwd(), 'tmp', 'pitchou')
  }

  fastify.register(fastifyStatic, {
    root: tmpDir,
    prefix: `/${PREFIX_FICHIER_TEMPORAIRE}/`,
  })
}