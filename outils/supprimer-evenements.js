import parseArgs from 'minimist'
import { getPersonnesByEmail } from '../scripts/server/database/personne.js';
import { closeDatabaseConnection } from '../scripts/server/database.js';

const args = parseArgs(process.argv)

const email = args['email']

let nombreSemaineÀConserver = args['conserver-dernières-semaines']

if(nombreSemaineÀConserver){
    nombreSemaineÀConserver = Number(nombreSemaineÀConserver)

    if(!Number.isSafeInteger(nombreSemaineÀConserver)){
        console.error(`"${args['conserver-dernières-semaines']}" n'est pas un nombre`)
        process.exit(1)
    }

    if(nombreSemaineÀConserver === 0){
        console.error(`C'est bizarre d'avoir mis '0' en nombre de semaines à conserver`)
        process.exit(1)
    }
}


if(!email && !nombreSemaineÀConserver){
    console.error(`Il manque soit l'argument "--email", soit "--conserver-dernières-semaines"`)
    process.exit(1)
}



//if(email)



/*

const emailsEnArgument = args.emails.split(',')

const personnesAvecCesEmails = await getPersonnesByEmail(emailsEnArgument)

for(const email of emailsEnArgument){
    const personne = personnesAvecCesEmails.find(p => p.email === email)
    if(!personne){
        console.log(`${email}\tPersonne non trouvée en base de données`)
    }
    else{
        if(personne.code_accès){
            const lienDeConnexion = `${origin}/?secret=${personne.code_accès}`

            console.log(`${email}\tLien de connexion: ${lienDeConnexion}`)
        }
        else{
            console.log(`${email}\tn'a pas de lien de connexion`)
        }

    }


}

*/

await closeDatabaseConnection()
