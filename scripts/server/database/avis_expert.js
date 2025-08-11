/** @import {default as Fichier, FichierId} from '../../types/database/public/Fichier.ts' */
/** @import AvisExpert, {AvisExpertInitializer} from '../../types/database/public/AvisExpert.ts' */
/** @import {DossierDS88444} from '../../types/démarches-simplifiées/apiSchema.ts' */

import knex from 'knex';
import { pitchouKeyToAnnotationDS } from '../../../outils/sync-démarches-simplifiées-88444.js';
import {directDatabaseConnection} from '../database.js'
import assert from 'node:assert';

/**
 * @param {DossierDS88444} dossierDS 
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersSaisinesCSRPN_CNPN_Téléchargés
 * @param {Map<DossierDS88444['number'], Fichier['id'][]> | undefined} fichiersAvisConformeMinistreTéléchargés
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<AvisExpertInitializer[]>}
 */
async function getLignesAvisExpertFromDossier(dossierDS, fichiersAvisCSRPN_CNPN_Téléchargés, fichiersSaisinesCSRPN_CNPN_Téléchargés, fichiersAvisConformeMinistreTéléchargés, databaseConnection = directDatabaseConnection) {
    const idPitchouDuDossier = (await databaseConnection('dossier').select('id').where('number_demarches_simplifiées', dossierDS.number).first()).id
    /** @type {(Pick<AvisExpert, "dossier" | "expert" | "avis" | "date_avis"> & Partial<Pick<AvisExpert, "date_saisine">>)[]} */
    let lignes_à_insérer = []

    /** @type {Map<string | undefined, any>} */
    const annotationById = new Map()
    for(const annotation of dossierDS.annotations){
         annotationById.set(annotation.id, annotation)
    }

    const fichiersAvisCSRPN_CNPN = fichiersAvisCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersSaisinesCSRPN_CNPN = fichiersSaisinesCSRPN_CNPN_Téléchargés?.get(Number(dossierDS.number))
    const fichiersAvisConformeMinistre = fichiersAvisConformeMinistreTéléchargés?.get(Number(dossierDS.number))

    if (fichiersAvisCSRPN_CNPN && fichiersAvisCSRPN_CNPN.length>=1) {
        /** @type {"CSRPN" | "CNPN" | null} */
        let expert_cnpn_csrpn = null
        
        const champDateAvisCNPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN"))?.date
        const champDateAvisCSRPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN"))?.date
        const champDateSaisineCNPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN"))?.date
        const champDateSaisineCSRPN = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN"))?.date

        if (champDateAvisCNPN || champDateSaisineCNPN) {
            expert_cnpn_csrpn = "CNPN"
        } else if (champDateAvisCSRPN || champDateSaisineCSRPN) {
            expert_cnpn_csrpn = "CSRPN"
        }

        /**
         * On doit passer par un filter pour le champ Avis CSRPN/CNPN
         * car il existe trois champs avec ce label dans les Annotations Privées
         */
        const champs_avis_csrpn_cnpn = dossierDS.annotations.filter((annotation) => annotation.label === "Avis CSRPN/CNPN")
        assert(champs_avis_csrpn_cnpn.length === 3, `Le nombre de champs dans les Annotations Privées avec le label "Avis CSRPN/CNPN" est incorrect : ${champs_avis_csrpn_cnpn.length} au lieu de 3. `)
        const id_champ_avis_csrpn_cnpn_selection = champs_avis_csrpn_cnpn[1].id

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
        lignes_à_insérer.push(ligne_cnpn_csrpn)
    }
    
    if (fichiersAvisConformeMinistre && fichiersAvisConformeMinistre.length>=1) {
        const date_avis_ministre = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis conforme Ministre"))?.date
        const fichier_avis_ministre = fichiersAvisConformeMinistre && fichiersAvisConformeMinistre.length >= 1 ? fichiersAvisConformeMinistre[0] : null

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
    } catch (erreur) {
        throw new Error(`Une erreur est survenue lors de la synchronisation de avis_expert : ${erreur}`);
    }
}
