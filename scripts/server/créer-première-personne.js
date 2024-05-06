import { créerPersonne } from "./database.js";

const personneData =  {
    nom: 'Rispal',
    prénoms: 'Vanessa',
    email: 'vanessa.rispal@developpement-durable.gouv.fr',
    code_accès: Math.random().toString(36).slice(2)
}

export default function(){
    return créerPersonne(personneData)
    .then(() => {
        console.log('Première personne créée 🎉')
        console.log(`URL d'accès:`, `https://especes-protegees.osc-fr1.scalingo.io/?secret=${personneData.code_accès}`)
    })
    .catch(err => {
        console.error('Erreur lors de la création de la première personne', err)
    })
}