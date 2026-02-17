//@ts-check
/** @import { default as Personne }  from "../scripts/types/database/public/Personne.ts" */
/** @import { default as Évènement }  from "../scripts/types/database/public/ÉvènementMétrique.ts" */
/** @import { ÉvènementMétrique } from '../scripts/types/évènement.js' */
import parseArgs from 'minimist'
import { directDatabaseConnection } from "../scripts/server/database.js";
import { format, startOfWeek } from 'date-fns';

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const args = parseArgs(process.argv)

if (!args.email) {
    console.error(`Il manque le paramètre --email`);
    process.exit(1)
}

const email = args.email

const évènements = await getÉvènementsForPersonne(email)
const évènementsCount = await getÉvènementsCountForPersonne(email)
const premièreSemaineActive = getPremièreSemaineActivéFromÉvènements(évènements)

console.log('évènements: ', évènements.length, ', évènementsCount: ', évènementsCount.length)
console.log('première semaine active : ', premièreSemaineActive)

process.exit(0)



/**
 * @param {Personne['email']} email
 * @returns {Promise<Évènement[]>} 
 */
async function getÉvènementsForPersonne(email) {
    const requêteSQL = await directDatabaseConnection('personne')
        .select('id')
        .where('email', '=', email)

    if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >=1 && requêteSQL[0].id)) {
        throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`)
    }

    const personneId = requêteSQL[0].id
    
    const évènements = await directDatabaseConnection('évènement_métrique')
        .select('*')
        .where('personne', '=', personneId)
        .orderBy('date','desc')

    return évènements
}

/**
 * @param {Personne['email']} email
 * @returns {Promise<{évènement: string, count: number}[]>} 
 */
async function getÉvènementsCountForPersonne(email) {
    const requêteSQL = await directDatabaseConnection('personne')
        .select('id')
        .where('email', '=', email)

    if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >=1 && requêteSQL[0].id)) {
        throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`)
    }

    const personneId = requêteSQL[0].id
    
    const évènementsCount = await directDatabaseConnection('évènement_métrique')
        .select('évènement')
        .count('évènement')
        .where('personne', '=', personneId)
        .groupBy('évènement')

    return évènementsCount.map((row) => ({ évènement: String(row.évènement), count: Number(row.count)}) )
}

/**
 * 
 * @param {Évènement[]} évènements 
 * @returns {Date | null}
 */
function getPremièreSemaineActivéFromÉvènements(évènements) {
    const seuilNombreActionsParSemaine = 5

    /** @type {ÉvènementMétrique['type'][]} */
    const évènementsModifications = [
        'modifierCommentaireInstruction', 
        'changerPhase', 
        'changerProchaineActionAttendueDe', 
        'ajouterDécisionAdministrative', 
        'modifierDécisionAdministrative', 
        'supprimerDécisionAdministrative'
    ]

    // On ne s'intéresse qu'aux évènements de modifications et on veut les trier de la date la plus récente vers la plus ancienne.
    // @ts-ignore
    const évènementsFiltrésEtOrdonnés = évènements.filter(({évènement}) => (évènementsModifications.includes(évènement))).sort((a,b) => a.date > b.date ? 1 : -1)

    /** @type {Record<string, number>} */
    const nombreÉvènementsParSemaine = {}

    for (const item of évènementsFiltrésEtOrdonnés) {
        const semaine = startOfWeek(item.date, {
            weekStartsOn: 1
        })
        const key = format(semaine, 'yyyy-MM-dd')
        if (!nombreÉvènementsParSemaine[key]) {
            nombreÉvènementsParSemaine[key] = 0
        }
        nombreÉvènementsParSemaine[key]+=1
    }


    for (const semaine of Object.keys(nombreÉvènementsParSemaine)) {
        if (nombreÉvènementsParSemaine[semaine] >= seuilNombreActionsParSemaine) {
            return new Date(semaine)
        }
    }
    
    return null;
}