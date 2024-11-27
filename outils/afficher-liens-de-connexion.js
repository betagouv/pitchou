import parseArgs from 'minimist'
import { getPersonnesByEmail } from '../scripts/server/database/personne.js';
import { closeDatabaseConnection } from '../scripts/server/database.js';

const args = parseArgs(process.argv)

if(!args.emails){
    console.error(`Il manque le paramètre --emails et des adresses emails séparées par des virgules`);
    process.exit(1)
}

const emailsEnArgument = args.emails.split(',')

const personnesAvecCesEmails = await getPersonnesByEmail(emailsEnArgument)

for(const email of emailsEnArgument){
    const personne = personnesAvecCesEmails.find(p => p.email === email)
    if(!personne){
        console.log(`${email}\tPersonne non trouvée en base de données`)
    }
    else{
        if(personne.code_accès){
            console.log(`${email}\tLien de connexion: http://localhost:2648/?secret=${personne.code_accès}`)
        }
        else{
            console.log(`${email}\tn'a pas de lien de connexion`)
        }

    }


}


await closeDatabaseConnection()