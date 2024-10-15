import lunr from "lunr"
import stemmerSupport from "lunr-languages/lunr.stemmer.support"
import lunrfr from "lunr-languages/lunr.fr"

import { retirerAccents } from "../commun/manipulationStrings.js"

/** @import {DossierComplet} from "../types.js" */

stemmerSupport(lunr)
lunrfr(lunr)

/**
 * 
 * @param {DossierComplet} dossier 
 * @returns 
 */
const créerDossierIndexable = (dossier) => {
    const {
        id,
        nom_dossier,
        number_demarches_simplifiées,
        nom,
        demandeur_personne_physique_prénoms,
        demandeur_personne_physique_nom,
        demandeur_personne_morale_raison_sociale,
        commentaire_libre,
        commentaire_enjeu,
    } = dossier

    return {
        id: id.toString(),
        number_demarches_simplifiées: number_demarches_simplifiées?.toString(),
        nom_dossier: retirerAccents(nom_dossier),
        nom: retirerAccents(nom || ""),
        demandeur_personne_physique_prénoms: 
            retirerAccents(demandeur_personne_physique_prénoms),
        demandeur_personne_physique_nom: 
            retirerAccents(demandeur_personne_physique_nom),
        demandeur_personne_morale_raison_sociale: 
            retirerAccents(demandeur_personne_morale_raison_sociale),
        commentaire_libre:
            retirerAccents(commentaire_libre || ""),
        commentaire_enjeu: 
            retirerAccents(commentaire_enjeu || ""),
    }
}

/**
 * 
 * @param {DossierComplet} dossier
 * @returns {lunr.Index}
 */
export const créerIndexDossier = dossier => {
    return lunr(function() {
        // @ts-expect-error TS ne comprends pas qu'on a ajouté lunrfr
        this.use(lunr.fr)

        this.ref("id")
        this.field("nom_dossier", { boost: 10 })
        this.field("number_demarches_simplifiées", { boost: 5})
        this.field("nom")
        this.field("demandeur_personne_physique_prénoms")
        this.field("demandeur_personne_physique_nom")
        this.field("demandeur_personne_morale_raison_sociale")
        this.field("commentaire_libre")
        this.field("commentaire_enjeu")
        this.add(créerDossierIndexable(dossier));
    })
}

/**
 * @param {string} texteÀChercher
 * @param {lunr.Index} index
 * @return {Boolean}
 */
export const contientTexteDansDossier = (texteÀChercher, index) => {
    if (texteÀChercher === "") { return false }
    
    return index.search(texteÀChercher).length > 0
}
