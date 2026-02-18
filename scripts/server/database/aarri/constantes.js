/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */


/** @type {ÉvènementMétrique['type'][]} */
export const ÉVÈNEMENTS_CONSULTATIONS= [
    'rechercherDesDossiers',
    'afficherLesDossiersSuivis',
    'consulterUnDossier',
    'téléchargerListeÉspècesImpactées'
]

/** @type {ÉvènementMétrique['type'][]} */
export const ÉVÈNEMENTS_MODIFICATIONS = [
    'suivreUnDossier',
    'modifierCommentaireInstruction', 
    'changerPhase', 
    'changerProchaineActionAttendueDe', 
    'ajouterDécisionAdministrative', 
    'modifierDécisionAdministrative', 
    'supprimerDécisionAdministrative',
    'ajouterPrescription',
    'modifierPrescription',
    'supprimerPrescription',
    'ajouterContrôle',
    'modifierContrôle',
    'supprimerContrôle'
]
