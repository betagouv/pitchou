//@ts-check

import remplirAnnotations from '../scripts/server/démarches-simplifiées/remplirAnnotations.js'

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

// Dossier 19155152

const result = await remplirAnnotations(
    DEMARCHE_SIMPLIFIEE_API_TOKEN, 
    {
        "Nom du porteur de projet": 'Steven Universe',
        "Localisation du projet": 'Beach city',
        "DDEP nécessaire ?": 'Oui',
        'Dossier en attente de': 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)',
        'Enjeu écologique': true,
        'Enjeu politique': true,
        'Commentaires sur les enjeux et la procédure': 'Procédure super importante de ouf ! Sauvons le lion rose !\nOn va pas se mentir, Mayor Dewey, il assure pas !',
        'Date de réception DDEP': new Date('2024-03-08'),
        "Commentaires libre sur l'état de l'instruction" : "Baaah ça avance lentement...",
        "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": new Date('2024-04-09'),
        'N° Demande ONAGRE': 'O1234',
        'Date saisine CNPN': new Date('2024-05-10'),
        'Date saisine CSRPN': new Date('2024-06-11'),
        'Date avis CNPN': new Date('2024-07-12'),
        'Date avis CSRPN': new Date('2024-08-13'),
        'Date de début de la consultation du public ou enquête publique': new Date('2024-09-14'),
        'Décision': 'AP dérogation',
        "Date de signature de l'AP": new Date('2024-10-15'),
        "Référence de l'AP": 'AP3256',
        "Date de l'AM": new Date('2024-11-16'),
        "Référence de l'AM": 'AM9874',
    }, 
    {
        dossierId: 'RG9zc2llci0xOTE1NTE1Mg',
        instructeurId: 'SW5zdHJ1Y3RldXItMTAyMjAx'
    }
)

const errors = result
    .map(r => {
        if(!r)
            return undefined;
        
        const mutationResult = r.dossierModifierAnnotationText || r.dossierModifierAnnotationCheckbox || r.dossierModifierAnnotationDate
        return mutationResult.errors
    })
    .filter(x => !!x)
    .flat()

if(errors.length >= 1){
    console.log('errors', errors)
}