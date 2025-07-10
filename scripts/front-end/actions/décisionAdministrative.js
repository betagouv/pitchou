import {getODSTableRawContent, tableRawContentToObjects, tableWithoutEmptyRows} from '@odfjs/odfjs'

import {isValidDate} from '../../commun/typeFormat.js'
import {ajouterPrescriptionsEtContrôles} from './prescriptions.js'

/** @import {FrontEndPrescription, FrontEndDécisionAdministrative} from '../../types/API_Pitchou.ts' */
/** @import Contrôle from '../../types/database/public/Contrôle.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * Trouve les données et les synchronise en BDD
 * 
 * @param {ArrayBuffer} fichierPrescriptionContrôleAB 
 * @param {FrontEndDécisionAdministrative} décisionAdministrative 
 * @returns {Promise<any>}
 */
export async function créerPrescriptionContrôlesÀPartirDeFichier(fichierPrescriptionContrôleAB, décisionAdministrative){
    const rawData = await getODSTableRawContent(fichierPrescriptionContrôleAB)
    const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0]

    const numéroDécision = décisionAdministrative.numéro

    /** @type {Omit<FrontEndPrescription, 'id'>[]} */
    // @ts-ignore
    const candidatsPrescriptions = cleanData.filter(row => {
        const prescriptionNumDec = row['Numéro décision administrative'] && row['Numéro décision administrative'].trim()
        // Garder la prescription candidate si elle n'a pas de numéro de décision ou s'il matche celui de la décision considéré
        return !prescriptionNumDec || prescriptionNumDec === (numéroDécision && numéroDécision.trim())
    })
    // @ts-ignore
    .map(row => {
        //console.log('row', row)

        const {
            "Numéro article": numéro_article,
            "Description": description,
            "Date échéance": date_échéance,
            "Surface compensée": surface_compensée,
            "Surface évitée": surface_évitée,
            "Individus compensés": individus_compensés, 
            "Individus évités": individus_évités,
            "Nids compensés": nids_compensés,
            "Nids évités": nids_évités,
        } = row

        /** @type {Omit<FrontEndPrescription, 'id'>} */
        const prescription = {
            décision_administrative: décisionAdministrative.id,
            date_échéance: isValidDate(new Date(date_échéance)) ? new Date(date_échéance) : null,
            numéro_article,
            description,
            individus_compensés: !individus_compensés ? undefined : individus_compensés,
            individus_évités: !individus_évités ? undefined : individus_évités,
            nids_compensés: !nids_compensés ? undefined : nids_compensés,
            nids_évités: !nids_évités ? undefined : nids_évités,
            surface_compensée: !surface_compensée ? undefined : surface_compensée,
            surface_évitée: !surface_évitée ? undefined : surface_évitée,
            contrôles: undefined
        }

        /** @type {Omit<Contrôle, 'id' | 'prescription'>[]} */
        let contrôles = []

        let numéroContrôle = 1

        while(true){
            const date_contrôleProp = `${numéroContrôle} Date contrôle`
            const résultatProp = `${numéroContrôle} Résultat contrôle`
            const commentaireProp = `${numéroContrôle} Commentaire`
            const type_action_suite_contrôleProp = `${numéroContrôle} Type de Suite`
            const date_action_suite_contrôleProp = `${numéroContrôle} Date de la suite`
            const date_prochaine_échéanceProp = `${numéroContrôle} Date Echéance`

            const date_contrôle = row[date_contrôleProp]
            const résultat = row[résultatProp]
            const commentaire = row[commentaireProp]
            const type_action_suite_contrôle = row[type_action_suite_contrôleProp]
            const date_action_suite_contrôle = row[date_action_suite_contrôleProp]
            const date_prochaine_échéance = row[date_prochaine_échéanceProp]

            if(date_contrôle && résultat){
                contrôles.push({
                    date_contrôle: isValidDate(new Date(date_contrôle)) ? new Date(date_contrôle) : null,
                    résultat,
                    commentaire,
                    type_action_suite_contrôle,
                    date_action_suite_contrôle: isValidDate(new Date(date_action_suite_contrôle)) ? new Date(date_action_suite_contrôle) : null,
                    date_prochaine_échéance: isValidDate(new Date(date_prochaine_échéance)) ? new Date(date_prochaine_échéance) : null,
                })

                numéroContrôle = numéroContrôle+1
            }
            else{
                break;
            }   
        }

        if(contrôles.length >= 1){
            // @ts-ignore
            prescription.contrôles = contrôles
        }

        return prescription;
    })

        
    //console.log('candidatsPrescriptions', candidatsPrescriptions)

    return ajouterPrescriptionsEtContrôles(candidatsPrescriptions)
}