import parseArgs from 'minimist'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { closeDatabaseConnection } from '../../scripts/server/database.js';
import {supprimerÉvènementsAvantTelleDate, supprimerÉvènementsParEmail} from '../../scripts/server/database/évènements_métriques.js';
import {subWeeks} from 'date-fns';

const args = parseArgs(process.argv)

const email = args['email']

let nombreSemaineÀConserver = args['conserver-dernières-semaines']

if(nombreSemaineÀConserver){
    nombreSemaineÀConserver = Number(nombreSemaineÀConserver)

    if(!Number.isSafeInteger(nombreSemaineÀConserver)){
        console.error(`"${args['conserver-dernières-semaines']}" n'est pas un nombre`)
        process.exit(1)
    }

    if(nombreSemaineÀConserver < 0){
        console.error(`C'est bizarre d'avoir mis un nombre négatif en nombre de semaines à conserver`)
        process.exit(1)
    }
    if(nombreSemaineÀConserver === 0){
        console.error(`C'est bizarre d'avoir mis 0 en nombre de semaines à conserver`)
        process.exit(1)
    }
}


if(!email && !nombreSemaineÀConserver){
    console.error(`Il manque soit l'argument "--email", soit "--conserver-dernières-semaines"`)
    process.exit(1)
}
if(email && nombreSemaineÀConserver){
    console.error(`Il y a les deux arguments "--email" et "--conserver-dernières-semaines". Cette situation n'est pas gérée. N'en choisir qu'un seul`)
    process.exit(1)
}

if(email){
    const nombreSupprimés = await supprimerÉvènementsParEmail(email)
    console.log(nombreSupprimés, `évènements supprimés concernant l'utilisateur.rice`, email)
}

if(nombreSemaineÀConserver){
    const date = subWeeks(new Date(), nombreSemaineÀConserver)
    const nombreSupprimés = await supprimerÉvènementsAvantTelleDate(date)
    console.log(nombreSupprimés, 
        `évènements qui dataient d'avant le`,
        format(date, 'd MMMM yyyy', { locale: fr }),
        `supprimés`
    )
}


await closeDatabaseConnection()
