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
        historique_identifiant_demande_onagre,
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
        historique_identifiant_demande_onagre:
            retirerAccents(historique_identifiant_demande_onagre || ""),
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
        this.field("historique_identifiant_demande_onagre")
        this.field("activité_principale")

        for (const dossier of dossiers) {
            this.add(créerDossierIndexable(dossier))
        }
    })
}


/**
 * @param {string} texteÀChercher
 * @param {lunr.Index} index
 * @return {lunr.Index.Result[]}
 */
const rechercherDossiersAvecTexte = (texteÀChercher, index) => {
    if (texteÀChercher === "") { return [] }
    
    return index.search(texteÀChercher)
}

/** @type {Map<string, Set<DossierComplet['id']>>} */
let résultatsDossierIdsParRecherche = new Map()

/** 
 * @param {string} texteÀChercher
 * @param {DossierComplet} dossier
 * @param {lunr.Index} index
 * @return {Boolean}
 */
export const contientTexteDansDossier = (texteÀChercher, dossier, index) => {
    /** @type {Set<DossierComplet['id']> | undefined} */
    const résultatsDossierIdsEnCache = résultatsDossierIdsParRecherche.get(texteÀChercher)

    if (résultatsDossierIdsEnCache) {
        // @ts-ignore
        if (résultatsDossierIdsEnCache.has(String(dossier.id))) return true 

        return false
    } 
    
    const lunrRésultats = rechercherDossiersAvecTexte(texteÀChercher, index)

    // @ts-expect-error TS ne sait pas que la `ref` correspond à l'`id` du dossier
    résultatsDossierIdsParRecherche.set(texteÀChercher, new Set(lunrRésultats.map(({ref}) => ref)))

    /** @type {Set<DossierComplet['id']> | undefined} */
    const nouveauxRésultatsDossierId = résultatsDossierIdsParRecherche.get(texteÀChercher)

    if (!nouveauxRésultatsDossierId || nouveauxRésultatsDossierId.size === 0) return false
    
    // @ts-ignore
    return nouveauxRésultatsDossierId.has(String(dossier.id))
}
