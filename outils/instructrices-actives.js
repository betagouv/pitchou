//import parseArgs from 'minimist'
import { differenceInWeeks } from 'date-fns'

import { getDateDernièreUtilisationParInstructrice } from '../scripts/server/database/analyse_utilisation.js';
import { closeDatabaseConnection } from '../scripts/server/database.js';
import {formatDateRelative} from '../scripts/front-end/affichageDossier.js';


/** @import {default as Personne} from '../scripts/types/database/public/Personne.js' */


//const args = parseArgs(process.argv)
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

/**
 * 
 * @param {[NonNullable<Personne['email']>, Date][]} personnesDates 
 * @returns 
 */
function afficherListePersonnesDates(personnesDates){
    return personnesDates.map(
        ([email, date]) => `  ${email} - ${formatDateRelative(date)}`
    ).join(('\n'))
}


/** @type {Map<NonNullable<Personne['email']>, Date>} */
const dateDernièreUtilisationParInstructrice = await getDateDernièreUtilisationParInstructrice()

const dateDernièreUtilisationParInstructriceEntries = [...dateDernièreUtilisationParInstructrice]
// grouper par <1sem, 1-2sem, 2-3sem, 3-4sem, 4+ sem

console.info('Dernière utilisation par instructrice')
console.warn('⚠️ Pitchou ne mesure pas encore quand les gens utilisent vraiment')
console.warn(`⚠️ les dates sont liées à l'activité sur un dossier suivi par une instructrice, pas à l'activité de l'instructrice elle-même`)

//console.log('dateDernièreUtilisationParInstructrice', dateDernièreUtilisationParInstructrice)

const moinsUneSemaine = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    return differenceInWeeks(new Date(), date) === 0
})

console.log(`Actif.ve entre maintenant et il y a une semaine (${moinsUneSemaine.length})`)
console.log(afficherListePersonnesDates(moinsUneSemaine))


const entre1et2Semaines = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    const diff = differenceInWeeks(new Date(), date)
    return diff === 1
})

console.log('Actif.ve entre il y a 1 et 2 semaines')
console.log(afficherListePersonnesDates(entre1et2Semaines))

const entre2et3Semaines = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    const diff = differenceInWeeks(new Date(), date)
    return diff === 2
})

console.log('Actif.ve entre il y a 2 et 3 semaines')
console.log(afficherListePersonnesDates(entre2et3Semaines))

const entre3et4Semaines = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    const diff = differenceInWeeks(new Date(), date)
    return diff === 3
})

console.log('Actif.ve entre il y a 3 et 4 semaines')
console.log(afficherListePersonnesDates(entre3et4Semaines))

const quatreSemainesEtPlus = dateDernièreUtilisationParInstructriceEntries.filter(([_email, date]) => {
    const diff = differenceInWeeks(new Date(), date)
    return diff >= 4
})

console.log('Actif.ve entre il y a 4+ semaines')
console.log(afficherListePersonnesDates(quatreSemainesEtPlus))



await closeDatabaseConnection()
