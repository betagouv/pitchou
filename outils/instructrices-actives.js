import parseArgs from 'minimist'
import { differenceInWeeks } from 'date-fns'

import { getDateDernièreUtilisationParInstructrice } from '../scripts/server/database/analyse_utilisation.js';
import { closeDatabaseConnection } from '../scripts/server/database.js';


/** @import {default as Personne} from '../scripts/types/database/public/Personne.js' */


const args = parseArgs(process.argv)
/*
if(!args.emails){
    console.error(`Il manque le paramètre --emails et des adresses emails séparées par des virgules`);
    process.exit(1)
}

let origin = 'http://localhost:2648';

if(args.prod)
    origin = 'https://pitchou.beta.gouv.fr'

if(args.origin)
    origin = args.origin
*/

/** @type {Map<NonNullable<Personne['email']>, Date>} */
const dateDernièreUtilisationParInstructrice = await getDateDernièreUtilisationParInstructrice()

const dateDernièreUtilisationParInstructriceEntries = [...dateDernièreUtilisationParInstructrice]
// grouper par <1sem, 1-2sem, 2-3sem, 3-4sem, 4+ sem

console.info('Dernière utilisation par instructrice')
console.warn('⚠️ Pitchou ne mesure pas encore quand les gens utilisent vraiment, alors les délais sont sous-estimés')

console.log('dateDernièreUtilisationParInstructrice', dateDernièreUtilisationParInstructrice)

const moinsUneSemaine = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    return differenceInWeeks(new Date(), date) < 1
})

console.log('moinsUneSemaine', moinsUneSemaine)


throw `faire le reste`




await closeDatabaseConnection()
