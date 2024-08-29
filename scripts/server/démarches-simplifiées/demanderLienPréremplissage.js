//@ts-check

import ky from "ky"
import { clefAE, schemaToChampLabelToChampId } from "../../commun/préremplissageDémarcheSimplifiée.js";

/** @import {DossierDemarcheSimplifiee88444} from "../../types/démarches-simplifiées/DémarcheSimplifiée88444.js" */
/** @import {SchemaDémarcheSimplifiée} from '../../types/démarches-simplifiées/schema.js' */

const communeChampRépété = `champ_Q2hhbXAtNDA0MTQ0Mw`
const départementChampRépété = `champ_Q2hhbXAtNDA0MTQ0Nw`

/**
 * 
 * @param {Partial<DossierDemarcheSimplifiee88444>} dossierPartiel
 * @param {SchemaDémarcheSimplifiée} schema88444
 * @returns {Record<string, string | string[] | any[]>}
 */
function créerObjetPréremplissageChamp(dossierPartiel, schema88444){
    const démarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444)

    /** @type {ReturnType<créerObjetPréremplissageChamp>} */
    const objetPréremplissage = {};

    for (const champ of démarcheDossierLabelToId.keys()) {
        if (![
            'Commune(s) où se situe le projet',
            'Département(s) où se situe le projet',
            'Région(s) où se situe le projet'
        // @ts-ignore
        ].includes(champ)
        ) {

            /** @type {DossierDemarcheSimplifiee88444[keyof DossierDemarcheSimplifiee88444] | undefined} */
            // @ts-ignore
            const valeur = dossierPartiel[champ]
            if (valeur) {
                // le `champ_` est une convention pour le pré-remplissage de Démarches Simplifiées
                objetPréremplissage[`champ_${démarcheDossierLabelToId.get(champ)}`] = valeur.toString()
            }
        }
    }

    if (dossierPartiel['Numéro de SIRET']) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Numéro de SIRET')}`] = dossierPartiel['Numéro de SIRET']
    }

    if (typeof dossierPartiel[clefAE] === 'boolean') {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get(clefAE)}`] =
            dossierPartiel[clefAE] ? 'true' : 'false'
    }

    if (dossierPartiel['Dans quel département se localise majoritairement votre projet ?']) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Dans quel département se localise majoritairement votre projet ?')}`] =
            dossierPartiel['Dans quel département se localise majoritairement votre projet ?'].code
    }

    // recups les départements
    if (Array.isArray(dossierPartiel['Département(s) où se situe le projet']) && dossierPartiel['Département(s) où se situe le projet'].length >= 1) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le projet se situe au niveau…')}`] = 
            "d'un ou plusieurs départements"

        objetPréremplissage[`champ_${démarcheDossierLabelToId.get(`Département(s) où se situe le projet`)}`] = 
            dossierPartiel['Département(s) où se situe le projet'].map(({code}) => ({
                [départementChampRépété]: code
            }))
    }
    else{
        // recups les communes
        if (Array.isArray(dossierPartiel['Commune(s) où se situe le projet']) && dossierPartiel['Commune(s) où se situe le projet'].length >= 1) {
            objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le projet se situe au niveau…')}`] = 
                "d'une ou plusieurs communes"
            
            objetPréremplissage[`champ_${démarcheDossierLabelToId.get(`Commune(s) où se situe le projet`)}`] = 
                dossierPartiel['Commune(s) où se situe le projet']
                    .filter(c => typeof c === 'object')
                    .map(({ code: codeInsee, codesPostaux: [codePostal] }) => ({
                        [communeChampRépété]: [codePostal, codeInsee]
                    }))
        }
    }

    return objetPréremplissage
}



/**
 * Démarche simplifiée propose 2 méthodes pour créer des liens de pré-remplissage : via GET ou POST
 * Cette fonction demande un lien via POST
 * 
 * @param {Partial<DossierDemarcheSimplifiee88444>} dossierPartiel
 * @param {SchemaDémarcheSimplifiée} schema88444
 * @returns {Promise<{dossier_url: string}>}
 */
export function demanderLienPréremplissage(dossierPartiel, schema88444){
    const préRemplissageURL = `https://www.demarches-simplifiees.fr/api/public/v1/demarches/88444/dossiers`

    return ky.post(
        préRemplissageURL, 
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Serveur Pitchou - https://github.com/betagouv/pitchou'
            },
            json: créerObjetPréremplissageChamp(dossierPartiel, schema88444)
        }
    )
    .then(resp => resp.json())
}
