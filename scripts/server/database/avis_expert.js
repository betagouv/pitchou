import knex from 'knex';
import { pitchouKeyToAnnotationDS } from '../../../outils/sync-démarches-simplifiées-88444.js';
import {directDatabaseConnection} from '../database.js'

/** @import {default as Fichier, FichierId} from '../../types/database/public/Fichier.ts' */
//@ts-ignore
/** @import AvisExpert from '../../types/database/public/AvisExpert.ts' */
//@ts-ignore
/** @import {DossierDS88444, Annotations88444} from '../../types/démarches-simplifiées/apiSchema.ts' */


const id_champ_avis_csrpn_cnpn_selection = "Q2hhbXAtNDI0ODQzMA=="

/**
 * @param {DossierDS88444} dossierDS 
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersSaisinesCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisConformeMinistreTéléchargés
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
async function getLignesAvisExpertFromDossier(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, databaseConnection = directDatabaseConnection) {
    const idPitchouDuDossier = (await databaseConnection('dossier').select('id').where('number_demarches_simplifiées', dossierDS.number).first()).id
    /** @type {(Pick<AvisExpert, "dossier" | "expert" | "avis" | "date_avis"> & Partial<Pick<AvisExpert, "date_saisine">>)[]} */
    let lignes_à_insérer = []

    /** @type {Map<string | undefined, Annotations88444>} */
    /** @type {Map<string | undefined, any>} */
    const annotationById = new Map()
    for(const annotation of dossierDS.annotations){
                annotationById.set(annotation.id, annotation)
    }

    const fichiersAvisCSRPN_CNPN = fichiersAvisCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersSaisinesCSRPN_CNPN = fichiersSaisinesCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersAvisConformeMinistre = fichiersAvisConformeMinistreTéléchargés?.get(Number(dossierDS.number))

    if (fichiersAvisCSRPN_CNPN?.length===0 || fichiersAvisConformeMinistre?.length===0) {
        // S'il n'y a aucun fichier avis expert, alors on ne veut pas ajouter cette nouvelle ligne dans la table.
        return [];
    } else {
        // Récupérer l'avis, s'il existe, émis soit par le CNPN, soit par le CSRPN (jamais les deux).
        /** @type {"CSRPN" | "CNPN" | null} */
        const expert_cnpn_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN"))?.date ? "CNPN" : annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN"))?.date ? "CSRPN" : annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN"))?.date ? "CNPN" : annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN"))?.date ? "CSRPN" : null
        const avis_csrpn_cnpn = annotationById.get(id_champ_avis_csrpn_cnpn_selection)?.stringValue || ''
        const fichier_avis_csrpn_cnpn = fichiersAvisCSRPN_CNPN && fichiersAvisCSRPN_CNPN.length>= 1 ? fichiersAvisCSRPN_CNPN[0] : null
        const fichier_saisine_csrpn_cnpn = fichiersSaisinesCSRPN_CNPN && fichiersSaisinesCSRPN_CNPN.length >= 1 ? fichiersSaisinesCSRPN_CNPN[0] : null

        let date_avis_cnpn_csprn
        let date_saisine_cnpn_csrpn
        if (expert_cnpn_csrpn === "CNPN") {
            date_avis_cnpn_csprn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN"))?.date ?? undefined
            date_saisine_cnpn_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN"))?.date ?? undefined
        } else if (expert_cnpn_csrpn) {
            date_avis_cnpn_csprn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN"))?.date ?? undefined
            date_saisine_cnpn_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN"))?.date ?? undefined
        }

        /** @type {Omit<AvisExpert, "id">} */
        const ligne_cnpn_csrpn = { dossier: idPitchouDuDossier, avis: avis_csrpn_cnpn, date_avis: date_avis_cnpn_csprn, date_saisine: date_saisine_cnpn_csrpn, expert: expert_cnpn_csrpn, avis_fichier: fichier_avis_csrpn_cnpn, saisine_fichier: fichier_saisine_csrpn_cnpn }

        // Si au moins un des champs CSRPN/CNPN est rempli, alors on ajoute la ligne en base de données.
        if (avis_csrpn_cnpn.trim()!=='' || date_avis_cnpn_csprn!==undefined || date_saisine_cnpn_csrpn!==undefined ) {
            lignes_à_insérer.push(ligne_cnpn_csrpn)
        }

        // Récupérer l'avis conforme, s'il existe, du Ministre.
        const date_avis_ministre = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis conforme Ministre"))?.date
        const fichier_avis_ministre = fichiersAvisConformeMinistre && fichiersAvisConformeMinistre.length >= 1 ? fichiersAvisConformeMinistre[0] : null
        if (date_avis_ministre) {
            console.log("ligne_ministre date : ", date_avis_ministre)
            /** @type {Omit<AvisExpert, "id">} */
            const ligne_ministre = {
                dossier: idPitchouDuDossier,
                date_avis: date_avis_ministre,
                expert: 'Ministre',
                avis: 'Conforme',
                avis_fichier: fichier_avis_ministre,
                saisine_fichier: null,
                date_saisine: null
            } 
            lignes_à_insérer.push(ligne_ministre)
        }
    }
    
    
    return lignes_à_insérer
}

/**
 * @param {DossierDS88444[]} dossiersDS 
 * @param {Map<number, FichierId[]> | undefined} fichiersAvisCSRPN_CNPN_Téléchargés
 * @param {Map<number, FichierId[]> | undefined} fichiersSaisinesCSRPN_CNPN_Téléchargés
 * @param {Map<number, FichierId[]> | undefined} fichiersAvisConformeMinistreTéléchargés
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 */
export async function synchroniserAvisExpert(dossiersDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, databaseConnection = directDatabaseConnection) {
    try {

        console.log("fichiersAvisCSRPN_CNPN_Téléchargés", fichiersAvisCSRPN_CNPN_Téléchargés && fichiersAvisCSRPN_CNPN_Téléchargés.size)
        console.log("fichiersSaisinesCSRPN_CNPN_Téléchargés", fichiersSaisinesCSRPN_CNPN_Téléchargés && fichiersSaisinesCSRPN_CNPN_Téléchargés.size)
        console.log("fichiersAvisConformeMinistreTéléchargés", fichiersAvisConformeMinistreTéléchargés && fichiersAvisConformeMinistreTéléchargés.size)

        const lignesAInsérer = await Promise.all(
            dossiersDS.map((dossierDS) => getLignesAvisExpertFromDossier(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, databaseConnection))
        );

        const lignesFlat = lignesAInsérer.flat();

        if (lignesFlat.length === 0) return;

        await databaseConnection('avis_expert')
            .insert(lignesFlat)
        
        return lignesFlat;
    } catch (e) {
        console.error('Une erreur est survenue lors de la synchronisation de avis_expert:', e);
    }
}
