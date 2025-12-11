/** @import {DossierRésumé} from '../types/API_Pitchou.ts' */
import {retirerAccents} from '../commun/manipulationStrings.js'
import {trouverDossiersIdCorrespondantsÀTexte} from './rechercherDansDossier.js'


/**
 * Crée un filtre pour rechercher dans les dossiers par texte.
 * Détecte automatiquement si le texte contient des chiffres :
 * - Avec chiffres : recherche dans les identifiants, départements, codes postaux, etc.
 * - Sans chiffres : utilise lunr pour la recherche textuelle avec support du français.
 * 
 * cf. https://github.com/MihaiValentin/lunr-languages/issues/66
 * lunr.fr n'indexe pas les chiffres, donc on gère la recherche sur les nombres avec une fonction séparée.
 * 
 * @param {string} texteÀChercher - Le texte à chercher
 * @param {DossierRésumé[]} dossiers - Liste complète des dossiers pour créer l'index de recherche (nécessaire pour la recherche sans chiffres)
 * @returns {(dossier: DossierRésumé) => boolean} - Fonction de filtrage
 */
export function créerFiltreTexte(texteÀChercher, dossiers) {
    // Si le texte contient des chiffres, utiliser la recherche directe
    if (texteÀChercher.match(/\d[\dA-Za-z\-]*/)) {
        return dossier => {
            const {
                id,
                départements,
                communes,
                number_demarches_simplifiées,
                historique_identifiant_demande_onagre,
            } = dossier
            const communesCodes = communes?.map(({postalCode}) => postalCode).filter(c => c) || []

            return String(id) === texteÀChercher ||
                départements?.includes(texteÀChercher || '') ||
                communesCodes?.includes(texteÀChercher || '') ||
                number_demarches_simplifiées === texteÀChercher ||
                historique_identifiant_demande_onagre === texteÀChercher
        }
    } else {
        // Sinon, utiliser lunr pour la recherche textuelle
        const texteSansAccents = retirerAccents(texteÀChercher)
        // Pour chercher les communes qui contiennent des tirets avec lunr,
        // on a besoin de passer la chaîne de caractères entre "".
        const aRechercher = texteSansAccents.match(/(\w-)+/) ?
            `"${texteSansAccents}"` :
            texteSansAccents
        const dossiersIdCorrespondantsÀTexte = trouverDossiersIdCorrespondantsÀTexte(aRechercher, dossiers)

        return dossier => {
            return dossiersIdCorrespondantsÀTexte.has(dossier.id)
        }
    }
}

