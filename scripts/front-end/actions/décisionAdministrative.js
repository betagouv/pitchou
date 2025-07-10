import {getODSTableRawContent, tableRawContentToObjects, tableWithoutEmptyRows} from '@odfjs/odfjs'

import {isValidDate} from '../../commun/typeFormat.js'

/** @import {FrontEndPrescription, FrontEndDécisionAdministrative} from '../../types/API_Pitchou.ts' */
/** @import Contrôle from '../../types/database/public/Contrôle.ts' */

/**
 * Trouve les données et les synchronise en BDD
 * 
 * @param {ArrayBuffer} fichierPrescriptionContrôleAB 
 * @param {FrontEndDécisionAdministrative} décisionAdministrative 
 * @returns {Promise<void>}
 */
export async function créerPrescriptionContrôlesÀPartirDeFichier(fichierPrescriptionContrôleAB, décisionAdministrative){
    const rawData = await getODSTableRawContent(fichierPrescriptionContrôleAB)
    const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0]

    const numéroDécision = décisionAdministrative.numéro

    /** @type {Partial<FrontEndPrescription>[]} */
    // @ts-ignore
    const candidatsPrescriptions = cleanData.filter(row => {
        const prescriptionNumDec = row['Numéro décision administrative'] && row['Numéro décision administrative'].trim()
        // Garder la prescription candidate si elle n'a pas de numéro de décision ou s'il matche celui de la décision considéré
        return !prescriptionNumDec || prescriptionNumDec === (numéroDécision && numéroDécision.trim())
    })
    // @ts-ignore
    .map(row => {
        console.log('row', row)

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

        const prescription = {
            décision_administrative: décisionAdministrative.id,
            date_échéance: isValidDate(new Date(date_échéance)) ? new Date(date_échéance) : undefined,
            numéro_article,
            description,
            individus_compensés: !individus_compensés ? undefined : individus_compensés,
            individus_évités: !individus_évités ? undefined : individus_évités,
            nids_compensés: !nids_compensés ? undefined : nids_compensés,
            nids_évités: !nids_évités ? undefined : nids_évités,
            surface_compensée: !surface_compensée ? undefined : surface_compensée,
            surface_évitée: !surface_évitée ? undefined : surface_évitée,
        }

        /** @type {Partial<Contrôle>[]} */
        let contrôles = []

        let numéroContrôle = 1

        //while(true){
            const {
                '1 Date contrôle': date_contrôle,
                '1 Résultat contrôle': résultat,
                '1 Commentaire': commentaire,
                '1 Type de Suite': type_action_suite_contrôle,
                '1 Date de la suite': date_action_suite_contrôle,
                '1 Date Echéance': date_prochaine_échéance
            } = row

            if(date_contrôle && résultat){
                contrôles.push({
                    date_contrôle: isValidDate(new Date(date_contrôle)) ? new Date(date_contrôle) : null,
                    résultat,
                    commentaire,
                    type_action_suite_contrôle,
                    date_action_suite_contrôle: isValidDate(new Date(date_action_suite_contrôle)) ? new Date(date_action_suite_contrôle) : null,
                    date_prochaine_échéance: isValidDate(new Date(date_prochaine_échéance)) ? new Date(date_prochaine_échéance) : null,
                })
            }
            else{
                //break;
            }
        //}

        console.log('contrôles', contrôles)

        



    })
        
    console.log('candidatsPrescriptions', candidatsPrescriptions)

    // prescriptions = prescriptions.union(new Set(candidatsPrescriptions))
    /*for(const p of prescriptions){
        savePrescription(p)
    }*/
}