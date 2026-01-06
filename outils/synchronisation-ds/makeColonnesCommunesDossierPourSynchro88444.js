/** @import {DémarchesSimpliféesCommune, ChampDSCommunes, ChampDSDépartements, ChampDSRégions, ChampDSDépartement, DémarchesSimpliféesDépartement, ChampScientifiqueIntervenants, BaseChampDS, DossierDS88444, Annotations88444, Champs88444} from '../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {DossierInitializer, DossierMutator} from '../../scripts/types/database/public/Dossier.ts' */

/** @import TypeDossier from '../../scripts/types/database/public/TypeDossier.ts' */

/** @import {ChampDescriptor} from '../../scripts/types/démarches-simplifiées/schema.ts' */

//@ts-ignore
const inutile = 'que pour éviter un //@ts-ignore sur les imports ci-dessus'

/**
 * Renvoie le dossier rempli des champs communs aux dossiers DS issus de la Démarche 88444 à initialiser et aux dossiers DS à modifier pour la synchronisation.
 * @param {DossierDS88444} dossierDS
 * @param {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToChampDS - Mapping des clés Pitchou vers les IDs de champs DS
 * @param {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} pitchouKeyToAnnotationDS - Mapping des clés Pitchou vers les IDs d'annotations DS
 * @returns {DossierInitializer| DossierMutator}
 */
export function makeColonnesCommunesDossierPourSynchro88444(
    dossierDS,
    pitchouKeyToChampDS,
    pitchouKeyToAnnotationDS
) {
    const {
        id: id_demarches_simplifiées,
        number,
        champs,
        annotations
    } = dossierDS

    /**
     * Meta données
     */
    const number_demarches_simplifiées = String(number)


    /**
     * Champs
     */
    /** @type {Map<string | undefined, Champs88444>} */
    /** @type {Map<string | undefined, any>} */
    const champById = new Map()
    for (const champ of champs) {
        champById.set(champ.id, champ)
    }

    /** @type {DossierDemarcheSimplifiee88444['Nom du projet']} */
    const nom = champById.get(pitchouKeyToChampDS.get('Nom du projet'))?.stringValue
    /** @type {DossierDemarcheSimplifiee88444['Description synthétique du projet']} */
    const description = champById.get(pitchouKeyToChampDS.get('Description synthétique du projet'))?.stringValue
    /** @type {DossierDemarcheSimplifiee88444['Activité principale']} */
    const activité_principale = champById.get(pitchouKeyToChampDS.get('Activité principale'))?.stringValue

    /** @type {DossierDemarcheSimplifiee88444['Date de début d’intervention']} */
    const date_début_intervention = champById.get(pitchouKeyToChampDS.get('Date de début d’intervention'))?.date
    /** @type {DossierDemarcheSimplifiee88444['Date de fin d’intervention']} */
    const date_fin_intervention = champById.get(pitchouKeyToChampDS.get('Date de fin d’intervention'))?.date
    /** @type {DossierDemarcheSimplifiee88444['Durée de la dérogation']} */
    const durée_intervention = Number(champById.get(pitchouKeyToChampDS.get('Durée de la dérogation'))?.stringValue)

    /** @type {DossierDemarcheSimplifiee88444[`Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`]} */
    const justification_absence_autre_solution_satisfaisante = champById.get(pitchouKeyToChampDS.get(`Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`))?.stringValue.trim()
    /** @type {DossierDemarcheSimplifiee88444[`Motif de la dérogation`]} */
    const motif_dérogation = champById.get(pitchouKeyToChampDS.get(`Motif de la dérogation`))?.stringValue
    /** @type {DossierDemarcheSimplifiee88444[`Synthèse des éléments justifiant le motif de la dérogation`]} */
    const justification_motif_dérogation = champById.get(pitchouKeyToChampDS.get(`Synthèse des éléments justifiant le motif de la dérogation`))?.stringValue.trim()




    /* localisation */
    /** @type {DossierDemarcheSimplifiee88444['Le projet se situe au niveau…'] | ''} */
    const projetSitué = champById.get(pitchouKeyToChampDS.get('Le projet se situe au niveau…'))?.stringValue
    /** @type {ChampDSCommunes} */
    const champCommunes = champById.get(pitchouKeyToChampDS.get('Commune(s) où se situe le projet'))
    /** @type {ChampDSDépartements} */
    const champDépartements = champById.get(pitchouKeyToChampDS.get('Département(s) où se situe le projet'))
    /** @type {ChampDSDépartement} */
    const champDépartementPrincipal = champById.get(pitchouKeyToChampDS.get('Dans quel département se localise majoritairement votre projet ?'))
    /** @type {ChampDSRégions} */
    const champRégions = champById.get(pitchouKeyToChampDS.get('Région(s) où se situe le projet'))


    /** @type {DémarchesSimpliféesCommune[] | undefined} */
    let communes;

    /** @type {DémarchesSimpliféesDépartement['code'][] | undefined} */
    let départements;
    let régions;

    if (projetSitué === `d'une ou plusieurs communes` && champCommunes) {
        communes = champCommunes.rows.map(c => c.champs[0].commune).filter(x => !!x)

        if (Array.isArray(communes) && communes.length >= 1) {
            départements = [...new Set(champCommunes.rows.map(c => c.champs[0].departement?.code).filter(x => !!x))]
        }
    }
    else {
        if (projetSitué === `d'un ou plusieurs départements` && champDépartements) {
            départements = [... new Set(champDépartements.rows.map(c => c.champs[0].departement?.code))].filter(x => !!x)
        }
        else {
            if (projetSitué === `d'une ou plusieurs régions` && champRégions) {
                régions = [... new Set(champRégions.rows.map(c => c.champs[0].stringValue))]
            }
            else {
                if (projetSitué === 'de toute la France') {
                    // ignorer
                }
                else {
                    if (!projetSitué) {
                        // ignorer
                    }
                    else {
                        console.log('localisation manquante', projetSitué, champs)
                        process.exit(1)
                    }
                }
            }
        }
    }

    // Si la localisation avec les champs dédiés (surtout communes et départements) a échoué,
    // se rabattre sur le champ du département principal s'il est présent
    if (champDépartementPrincipal && champDépartementPrincipal.departement && (!départements || départements.length === 0)) {
        départements = [champDépartementPrincipal.departement.code]
    }

    /** Régime AE */
    // le champ AE a changé d'une checkbox à un Oui/Non à un Oui/Non/Ne sait pas encore
    // et donc, on gère les différentes valeurs pour les différentes version du formulaire

    const rattaché_régime_ae_champ = champById.get(
        pitchouKeyToChampDS.get("Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?")
    )

    const rattaché_au_régime_ae_stringValue = rattaché_régime_ae_champ?.stringValue

    // null signifie "ne sait pas encore" et c'est la valeur par défaut
    let rattaché_au_régime_ae = null;

    if (rattaché_au_régime_ae_stringValue === 'Oui' || rattaché_au_régime_ae_stringValue === 'true') {
        rattaché_au_régime_ae = true;
    }
    if (rattaché_au_régime_ae_stringValue === 'Non' || rattaché_au_régime_ae_stringValue === 'false') {
        rattaché_au_régime_ae = false
    }

    /** Mesures ERC prévues */
    const mesures_erc_prévues_champ = champById.get(
        pitchouKeyToChampDS.get("Des mesures ERC sont-elles prévues ?")
    )
    const mesures_erc_prévues = mesures_erc_prévues_champ?.checked

    const etat_des_lieux_ecologique_complet_realise_champ = champById.get(
        pitchouKeyToChampDS.get("Avez-vous réalisé un état des lieux écologique complet ?"))
    const etat_des_lieux_ecologique_complet_realise = etat_des_lieux_ecologique_complet_realise_champ?.checked

    const presence_especes_dans_aire_influence_champ = champById.get(
        pitchouKeyToChampDS.get("Avez-vous réalisé un état des lieux écologique complet ?"))
    const presence_especes_dans_aire_influence = presence_especes_dans_aire_influence_champ?.checked

    const risque_malgre_mesures_erc_champ = champById.get(
        pitchouKeyToChampDS.get("Avez-vous réalisé un état des lieux écologique complet ?"))
    const risque_malgre_mesures_erc = risque_malgre_mesures_erc_champ?.checked

    /** Données dossier scientifique */
    /** @type {DossierDemarcheSimplifiee88444['Recherche scientifique - Votre demande concerne :']} */
    const scientifique_type_demande_values = champById.get(pitchouKeyToChampDS.get('Recherche scientifique - Votre demande concerne :'))?.values

    /** @type {DossierDemarcheSimplifiee88444['Captures/Relâchers/Prélèvement - Finalité(s) de la demande']} */
    const scientifique_finalité_demande = champById.get(pitchouKeyToChampDS.get('Captures/Relâchers/Prélèvement - Finalité(s) de la demande'))?.values

    /** @type {DossierDemarcheSimplifiee88444['Cette demande concerne un programme de suivi déjà existant']} */
    const scientifique_bilan_antérieur = champById.get(pitchouKeyToChampDS.get('Cette demande concerne un programme de suivi déjà existant'))?.checked
    // "Non renseigné" est tranformé en 'false'

    /** @type {DossierDemarcheSimplifiee88444['Description du protocole de suivi']} */
    const scientifique_description_protocole_suivi = champById.get(pitchouKeyToChampDS.get('Description du protocole de suivi'))?.stringValue

    /** @type {DossierDemarcheSimplifiee88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`][]} */
    const scientifique_précisez_mode_capture_values = champById.get(pitchouKeyToChampDS.get(`En cas de nécessité de capture d'individus, précisez le mode de capture`))?.values

    /** @type {DossierDemarcheSimplifiee88444[`Préciser le(s) autre(s) moyen(s) de capture`]} */
    const scientifique_precisez_autre_capture = champById.get(pitchouKeyToChampDS.get(`Préciser le(s) autre(s) moyen(s) de capture`))?.stringValue

    /** @type {Set<DossierDemarcheSimplifiee88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`] | DossierDemarcheSimplifiee88444[`Préciser le(s) autre(s) moyen(s) de capture`]>} */
    const scientifique_mode_capture_set = scientifique_précisez_mode_capture_values ? new Set(scientifique_précisez_mode_capture_values) : new Set()

    if (scientifique_precisez_autre_capture) {
        scientifique_mode_capture_set.delete('Autre moyen de capture (préciser)')
        scientifique_mode_capture_set.add(scientifique_precisez_autre_capture)
    }

    const scientifique_mode_capture = JSON.stringify([...scientifique_mode_capture_set])


    /** @type {DossierDemarcheSimplifiee88444[`Utilisez-vous des sources lumineuses ?`]} */
    const scientifique_modalités_source_lumineuses_boolean = champById.get(pitchouKeyToChampDS.get(`Utilisez-vous des sources lumineuses ?`))?.checked

    /** @type {DossierDemarcheSimplifiee88444[`Précisez les modalités de l'utilisation des sources lumineuses`]} */
    const scientifique_modalités_source_lumineuses_précisez = champById.get(pitchouKeyToChampDS.get(`Précisez les modalités de l'utilisation des sources lumineuses`))?.stringValue


    const scientifique_modalités_source_lumineuses = scientifique_modalités_source_lumineuses_boolean && scientifique_modalités_source_lumineuses_précisez ?
        scientifique_modalités_source_lumineuses_précisez :
        undefined

    /** @type {DossierDemarcheSimplifiee88444[`Précisez les modalités de marquage pour chaque taxon`]} */
    const scientifique_modalités_marquage = champById.get(pitchouKeyToChampDS.get(`Précisez les modalités de marquage pour chaque taxon`))?.stringValue || undefined


    /** @type {DossierDemarcheSimplifiee88444[`Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`]} */
    const scientifique_modalités_transport = champById.get(pitchouKeyToChampDS.get(`Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`))?.stringValue || undefined

    /** @type {DossierDemarcheSimplifiee88444[`Précisez le périmètre d'intervention`]} */
    const scientifique_périmètre_intervention = champById.get(pitchouKeyToChampDS.get(`Précisez le périmètre d'intervention`))?.stringValue || undefined

    /** @type {ChampScientifiqueIntervenants | undefined} */
    let scientifique_qualifications_intervenants = champById.get(pitchouKeyToChampDS.get(`Qualification des intervenants`)) || undefined

    /** @type {BaseChampDS[][] | undefined} */
    let rowsChamp = scientifique_qualifications_intervenants &&
        scientifique_qualifications_intervenants.rows.map(r => r.champs)

    /** @type { {nom_complet?: string, qualification?: string}[] | undefined} */
    let scientifique_intervenants = undefined;

    if (Array.isArray(rowsChamp)) {
        scientifique_intervenants = rowsChamp.map(champs => {
            const champNomComplet = champs.find(c => c.label === 'Nom Prénom')
            const champQualification = champs.find(c => c.label === 'Qualification')

            return {
                nom_complet: champNomComplet && champNomComplet.stringValue,
                qualification: champQualification && champQualification.stringValue,
            }
        })
    }

    /** @type {DossierDemarcheSimplifiee88444[`Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`]} */
    const scientifique_précisions_autres_intervenants = champById.get(pitchouKeyToChampDS.get(`Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`))?.stringValue || undefined;

    /**
     * Annotations privées
     */
    /** @type {Map<string | undefined, Annotations88444>} */
    /** @type {Map<string | undefined, any>} */
    const annotationById = new Map()
    for (const annotation of annotations) {
        annotationById.set(annotation.id, annotation)
    }

    const champ_ddep_nécessaire = annotationById.get(pitchouKeyToAnnotationDS.get("DDEP nécessaire ?"))?.stringValue

    const ddep_nécessaire = champ_ddep_nécessaire && ['Oui', 'Non'].includes(champ_ddep_nécessaire) ? champ_ddep_nécessaire : null;

    const enjeu_écologique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu écologique")).checked
    const enjeu_politique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu politique")).checked

    const historique_date_envoi_dernière_contribution = annotationById.get(pitchouKeyToAnnotationDS.get("Date d'envoi de la dernière contribution en lien avec l'instruction DDEP")).date
    const historique_identifiant_demande_onagre = annotationById.get(pitchouKeyToAnnotationDS.get("N° Demande ONAGRE")).stringValue

    const date_debut_consultation_public = annotationById.get(pitchouKeyToAnnotationDS.get("Date de début de la consultation du public ou enquête publique")).date
    const date_fin_consultation_public = annotationById.get(pitchouKeyToAnnotationDS.get("Date de fin de la consultation du public ou enquête publique"))?.date
    const champ_nombre_nids_compensés_oiseau_simple = champById.get(pitchouKeyToChampDS.get('Indiquer le nombre de nids artificiels posés en compensation'))?.stringValue
    const nombre_nids_compensés_dossier_oiseau_simple = champ_nombre_nids_compensés_oiseau_simple ? Number(champ_nombre_nids_compensés_oiseau_simple) : null

    const champ_nombre_nids_détruits_oiseau_simple_hirondelle = champById.get(pitchouKeyToChampDS.get('Nombre de nids d\'Hirondelles détruits'))?.stringValue
    const nombre_nids_détruits_dossier_oiseau_simple = champ_nombre_nids_détruits_oiseau_simple_hirondelle ? Number(champ_nombre_nids_détruits_oiseau_simple_hirondelle) : null

    const champ_transport_ferroviaire_electrique = champById.get(pitchouKeyToChampDS.get('Transport ferroviaire ou électrique - Votre demande concerne :'))?.stringValue;

    /** @type {TypeDossier | null} */
    const type = champ_nombre_nids_détruits_oiseau_simple_hirondelle ? 'Hirondelle' : champ_transport_ferroviaire_electrique === 'Destruction de nids de Cigognes' ? 'Cigogne' : null

    return {
        // méta-données
        id_demarches_simplifiées,
        number_demarches_simplifiées,

        // demandeur_personne_physique,
        // demandeur_personne_morale,
        // déposant,

        // champs
        etat_des_lieux_ecologique_complet_realise,
        presence_especes_dans_aire_influence,
        risque_malgre_mesures_erc,

        nom,
        description,
        activité_principale,
        date_début_intervention,
        date_fin_intervention,
        durée_intervention,

        justification_absence_autre_solution_satisfaisante,
        motif_dérogation,
        justification_motif_dérogation,

        // localisation
        // https://knexjs.org/guide/schema-builder.html#json
        communes: JSON.stringify(communes),
        départements: JSON.stringify(départements),
        régions: JSON.stringify(régions),

        // régime AE
        rattaché_au_régime_ae,

        // mesurse ERC prévues
        mesures_erc_prévues,

        /**
         * Les données de dossier scientifique
         */
        //@ts-ignore Les colonnes en type de base de données 'json' sont insérés sous forme de string après un JSON.stringify
        scientifique_type_demande: scientifique_type_demande_values ? JSON.stringify(scientifique_type_demande_values) : undefined,
        scientifique_finalité_demande: scientifique_finalité_demande ? JSON.stringify(scientifique_finalité_demande) : undefined,
        scientifique_bilan_antérieur,
        scientifique_description_protocole_suivi,
        //@ts-ignore Les colonnes en type de base de données 'json' sont insérés sous forme de string après un JSON.stringify
        scientifique_mode_capture,
        scientifique_modalités_source_lumineuses,
        scientifique_modalités_marquage,
        scientifique_modalités_transport,
        scientifique_périmètre_intervention,
        scientifique_intervenants: JSON.stringify(scientifique_intervenants),
        scientifique_précisions_autres_intervenants,

        // annotations privées
        ddep_nécessaire,

        enjeu_écologique,
        enjeu_politique,

        historique_date_envoi_dernière_contribution,
        historique_identifiant_demande_onagre,

        date_debut_consultation_public,
        date_fin_consultation_public,

        nombre_nids_compensés_dossier_oiseau_simple,
        nombre_nids_détruits_dossier_oiseau_simple,

        type
    }
}
