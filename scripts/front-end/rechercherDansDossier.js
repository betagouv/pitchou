import lunr from "lunr"
import stemmerSupport from "lunr-languages/lunr.stemmer.support"
import lunrfr from "lunr-languages/lunr.fr"

import { retirerAccents } from "../commun/manipulationStrings.js"

/** @import {DossierComplet, StringValues} from "../types.js" */

stemmerSupport(lunr)
lunrfr(lunr)

/**
 * @param {DossierComplet} dossier
 * @returns {StringValues<Partial<DossierComplet>>}
 */
const créerDossierIndexable = dossier => {
    const {
        id,
        nom_dossier,
        number_demarches_simplifiées,
        communes,
        nom,
        déposant_nom,
        déposant_prénoms,
        demandeur_personne_physique_prénoms,
        demandeur_personne_physique_nom,
        demandeur_personne_morale_raison_sociale,
        activité_principale,
    } = dossier

    return {
        id: id.toString(),
        number_demarches_simplifiées: number_demarches_simplifiées?.toString(),
        nom_dossier: retirerAccents(nom_dossier),
        communes: communes?.map(({name}) => retirerAccents(name || "")).join(" ") || "",
        nom: retirerAccents(nom || ""),
        déposant_nom: retirerAccents(déposant_nom || ""),
        déposant_prénoms: retirerAccents(déposant_prénoms || ""),
        demandeur_personne_physique_prénoms: 
            retirerAccents(demandeur_personne_physique_prénoms || ""),
        demandeur_personne_physique_nom: 
            retirerAccents(demandeur_personne_physique_nom || ""),
        demandeur_personne_morale_raison_sociale: 
            retirerAccents(demandeur_personne_morale_raison_sociale || ""),
        activité_principale: 
            retirerAccents(activité_principale || ""),
    }
}

/**
 * 
 * @param {DossierComplet[]} dossiers
 * @returns {lunr.Index}
 */
export const créerIndexDossiers = dossiers => {
    return lunr(function() {
        // @ts-expect-error TS ne comprends pas qu'on a ajouté lunrfr
        this.use(lunr.fr)

        this.ref("id")
        this.field("nom_dossier")
        this.field("number_demarches_simplifiées")
        this.field("communes")
        this.field("nom")
        this.field("déposant_nom")
        this.field("déposant_prénoms")
        this.field("demandeur_personne_physique_prénoms")
        this.field("demandeur_personne_physique_nom")
        this.field("demandeur_personne_morale_raison_sociale")
        this.field("activité_principale")

        for (const dossier of dossiers) {
            this.add(créerDossierIndexable(dossier))
        }
    })
}

/**
 * 
 * @param {string} texteÀChercher 
 * @param {DossierComplet[]} dossiers 
 * @returns {Set<DossierComplet['id']>}
 */
export const trouverDossiersIdCorrespondantsÀTexte = (texteÀChercher, dossiers) => {
    const index = créerIndexDossiers(dossiers)
    const lunrRésultats = index.search(texteÀChercher)

    // @ts-expect-error TS ne sait pas que la `ref` correspond à l'`id` du dossier
    return new Set(lunrRésultats.map(({ref}) => Number(ref)))
}
