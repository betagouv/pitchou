//@ts-check

import remplirAnnotations from '../scripts/server/démarches-simplifiées/remplirAnnotations.js'
// @ts-ignore
import {dossierSuiviNAVersAnnotationsDS88444} from '../scripts/import-dossiers-historiques/nouvelle-aquitaine/conversions.js'

/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from "../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.js" */

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

//@ts-ignore
const annotationsVides = dossierSuiviNAVersAnnotationsDS88444({})

//const annotations = annotationsVides

// Dossier 19155152

/** @type {Partial<AnnotationsPriveesDemarcheSimplifiee88444>} */
const annotations = {
    "Nom du porteur de projet": 'Steven Universe',
    "Localisation du projet": 'Beach city',
    "DDEP nécessaire ?": 'Oui',
    'Enjeu écologique': true,
    'Enjeu politique': true,
    'Commentaires sur les enjeux et la procédure': 'Procédure super importante de ouf ! Sauvons le lion rose !\nOn va pas se mentir, Mayor Dewey, il assure pas !',
    'Date de réception DDEP': new Date('2024-03-08'),
    "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": new Date('2024-04-09'),
    'N° Demande ONAGRE': 'O1234',
    'Date saisine CNPN': new Date('2024-05-10'),
    'Date saisine CSRPN': new Date('2024-06-11'),
    'Date avis CNPN': new Date('2024-07-12'),
    'Date avis CSRPN': new Date('2024-08-13'),
    'Date de début de la consultation du public ou enquête publique': new Date('2024-09-14'),
}



const result = await remplirAnnotations(
    DEMARCHE_SIMPLIFIEE_API_TOKEN,
    {
        dossierId: 'RG9zc2llci0xOTE1NTE1Mg',
        instructeurId: 'SW5zdHJ1Y3RldXItMTAyMjAx',
        annotations
    }
)

if (result) {
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
}