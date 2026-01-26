import parseArgs from 'minimist'
import { récupérerSecretGeoMCE } from '../scripts/server/database/capability-geomce.js';
import { closeDatabaseConnection } from '../scripts/server/database.js';

const args = parseArgs(process.argv)

const getCap = args['capability-url']
const resetCap = args['reset-capability-url']

if(!getCap && !resetCap){
    console.error(`Utiliser l'argument --capability-url ou --reset-capability-url`)
}

if(resetCap){
    throw 'TODO'
}

if(getCap){

    let origin = 'https://pitchou.beta.gouv.fr';

    if(args.dev)
        origin = 'http://localhost:2648'

    if(args.origin)
        origin = args.origin

    const secret = await récupérerSecretGeoMCE()
    const lienDeConnexion = `${origin}/declaration-geomce?secret=${secret}`

    console.log("Lien d'API GeoMCE:", lienDeConnexion)
}


await closeDatabaseConnection()
