//@ts-check

/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */
/** @import { DonnéesSupplémentairesPourCréationDossier } from "./importDossierUtils" */
/** @import {VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer}  from '../../types/database/public/ÉvènementPhaseDossier' */
/** @import { PartialBy }  from '../../types/tools' */
/** @import {AvisExpertInitializer}  from '../../types/database/public/AvisExpert' */
/** @import {DCisionAdministrativeInitializer as DécisionAdministrativeInitializer}  from '../../types/database/public/DécisionAdministrative' */

import { isValidDateString } from "../../commun/typeFormat";
import { formaterDépartementDepuisValeur, extraireCommunes, getCommuneData } from "./importDossierUtils";


/**
 * @typedef {{
 *   Remarques: string;
 *   Département: string;
 *   Commune: string;
 *   "Nom du demandeur": string;
 *   "Type de projet": string;
 *   "Libellé Projet": string;
 *   "Service Pilote": string;
 *   "Espèces impactées": string;
 *   Raccourci: string;
 *   Statut: string;
 *   "Niveau d'avancement": string;
 *   "Date de début d'accompagnement": number;
 *   "Date de réception 1er dossier": string | number | Date;
 *   "Date de réception du dossier complet": string | Date;
 *   "Nombre de jours restant pour instruction dossier": string;
 *   "N°ONAGRE": string;
 *   "Date de dépôt sur ONAGRE": string | Date;
 *   "Instructeur DREAL": string;
 *   Compétence: string;
 *   "Avis rendu": string;
 *   "Date avis": string;
 *   Contribution: string;
 *   "Commentaires phase instruction": string;
 *   "Début consultation": string;
 *   "Fin de publication": string | Date;
 *   "Numéro AP": string;
 *   "Date AP": string | Date;
 *   "Commentaires post AP": string;
 * }} LigneDossierCorse // D'après le tableau envoyé le 25/07/2025
 */


/**
 * @param {LigneDossierCorse} ligne
 * @return {string}
 */
export function créerNomPourDossier(ligne) {
    return ligne['Libellé Projet']
}

/**
 * @typedef {"ZAE" |
 *   "Autres" |
 *   "Carrière (ICPE)" |
 *   "Centre de tri (ICPE)" |
 *   "Centre de vacances" |
 *   "Électrique" |
 *   "Hydroélectrique" |
 *   "Ouvrages d’art" |
 *   "Projet immobilier" |
 *   "Routes" |
 *   "Stockage de déchets (ISDND)"
 * } TypeDeProjetOptions
 */

/**
 * @type {Map<TypeDeProjetOptions,  DossierDemarcheSimplifiee88444['Activité principale']>}
 */
const correspondanceTypeDeProjetVersActivitéPrincipale = new Map([
    ["ZAE", "ZAC"],
    ["Autres", "Autre"],
    ["Carrière (ICPE)", "Carrières"],
    ["Centre de tri (ICPE)", "Installations de gestion des déchets"],
    ["Centre de vacances", "Installations de loisir et de tourisme"],
    ["Électrique", "Transport énergie électrique"],
    ["Hydroélectrique", "Production énergie renouvelable - Hydroélectricité"],
    ["Ouvrages d’art", "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"],
    ["Projet immobilier", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Routes", "Infrastructures de transport routières"],
    ["Stockage de déchets (ISDND)", "Installations de gestion des déchets"]
]);


/**
 *
 * @param {LigneDossierCorse} ligne
 * @param {string[]} warnings
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
 */
function convertirTypeDeProjetEnActivitéPrincipale(ligne, warnings, activitésPrincipales88444) {
    const typeDeProjet = ligne['Type de projet'].trim()

    // Si le type de projet est déjà une valeur pitchou
    // @ts-ignore
    if (activitésPrincipales88444.has(typeDeProjet)) {
        // @ts-ignore
        return typeDeProjet
    }

    const activité = correspondanceTypeDeProjetVersActivitéPrincipale.get(    /** @type {TypeDeProjetOptions} */(typeDeProjet))
    if (activité) {
        return activité
    }

    const messageWarning = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`
    console.warn(messageWarning);
    warnings.push(messageWarning)

    return 'Autre';
}

/**
 * @param {LigneDossierCorse} ligne
 * @returns {Pick<DossierDemarcheSimplifiee88444, "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?" | "À quelle procédure le projet est-il soumis ?">}
 */
function générerDonnéesAutorisationEnvironnementale(ligne) {
    const type_de_projet = ligne['Type de projet'].toLowerCase();

    if (type_de_projet.includes('icpe')) {
        return {
            "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Oui',
            "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE"]
        };
    }

    return {
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Non',
        "À quelle procédure le projet est-il soumis ?": []
    };
}

/**
 *
 * @param {{Commune: string | undefined, Département: number | string}} ligne
 * @param {string[]} [warnings]
 * @returns { Promise<
 *              Partial<Pick<DossierDemarcheSimplifiee88444,
 *                  "Commune(s) où se situe le projet" |
 *                  "Département(s) où se situe le projet" |
 *                  "Le projet se situe au niveau…"
 *              >> & Pick<DossierDemarcheSimplifiee88444, "Dans quel département se localise majoritairement votre projet ?">
 *           >}
 */
async function générerDonnéesLocalisations(ligne, warnings) {
    const départementParDéfaut = {code: '2A', nom: 'Corse-du-Sud'}

    const valeursCommunes = extraireCommunes(ligne['Commune'] ?? '');

    const communesP = valeursCommunes.map((com) => getCommuneData(com, warnings));
    const départementsP = formaterDépartementDepuisValeur(ligne['Département'], warnings);

    const [départementsTrouvés, communesResult] = await Promise.all([
        départementsP,
        Promise.all(communesP),
    ]);

    const communes = communesResult.filter((commune) => commune !== null);

    const départementColonne = Array.isArray(départementsTrouvés) && départementsTrouvés[0] ? 
        départementsTrouvés[0] : 
        undefined

    if (communes.length >= 1) {
        const départementPremièreCommune = communes[0].departement

        return {
            "Commune(s) où se situe le projet": communes,
            "Département(s) où se situe le projet": undefined,
            "Le projet se situe au niveau…": "d'une ou plusieurs communes",
            "Dans quel département se localise majoritairement votre projet ?": départementColonne ?? départementPremièreCommune
        }
    } else {
        const départements =  Array.isArray(départementsTrouvés) ? départementsTrouvés : [départementParDéfaut]
        return {
            "Commune(s) où se situe le projet": undefined,
            "Département(s) où se situe le projet": départements,
            "Le projet se situe au niveau…": "d'un ou plusieurs départements",
            "Dans quel département se localise majoritairement votre projet ?": départements[0]
        }
    }
}

/**
 *
 * @param {LigneDossierCorse} ligne
 * @returns {PartialBy<AvisExpertInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesAvisExpert(ligne) {
    const expert = ligne['Compétence']
    const avis = ligne['Avis rendu']
    const date_avis = new Date(ligne['Date avis'].toString())

    if (expert!=='' || avis!== '') {
        return [{avis, date_avis, expert}]
    }
}

/**
 *
 * @param {LigneDossierCorse} ligne
 * @param {string[]} warnings
 * @returns {PartialBy<DécisionAdministrativeInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesDécisionAdministrative(ligne, warnings) {
    const valeurDateAP = ligne['Date AP']

    if (!(!valeurDateAP || typeof valeurDateAP === 'string' && valeurDateAP === '')) {
        if (isValidDateString(valeurDateAP.toString())) {
            return [{date_signature: new Date(valeurDateAP), type: 'Autre décision', numéro: ligne['Numéro AP']}]
        } else {
            const messageWarning = `La date indiquée dans la colonne Date AP est incorrecte : ${valeurDateAP}. On n'importe donc pas de décision administrative.`
            console.warn(messageWarning)
            warnings.push(messageWarning)
        }

    }
}


/**
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * @param {LigneDossierCorse} ligne
 * @param {string[]} warnings
 * @returns { DonnéesSupplémentairesPourCréationDossier }d
 */
function créerDonnéesSupplémentairesDepuisLigne(ligne, warnings) {
    const nomDuDemandeur = `Nom du demandeur :  ${ligne['Nom du demandeur']}`
    const commentairePhaseInstruction = ligne['Commentaires phase instruction'].trim() !== '' ?`Commentaire phase instruction : ${ligne['Commentaires phase instruction']}` : ''
    const commentairePostAP = ligne['Commentaires post AP'].trim() !== '' ? `Commentaires post AP : ${ligne['Commentaires post AP']}` : ''
    const commentaire_libre = [nomDuDemandeur, commentairePhaseInstruction, commentairePostAP]
        .filter(value => value?.trim())
        .join('\n');

    const donnéesEvénementPhaseDossier = créerDonnéesEvénementPhaseDossier(ligne, warnings)
    const avisExpert = créerDonnéesAvisExpert(ligne)

    const décisionAdministrative = créerDonnéesDécisionAdministrative(ligne, warnings)

    const dateDébutConsultation = isValidDateString(ligne['Début consultation']) ? new Date(ligne['Début consultation']) : undefined

    // TODO : mettre aussi la date de fin de consultation quand la base de données Pitchou sera prête.
        
    return {
        dossier: {
            'historique_identifiant_demande_onagre': ligne['N°ONAGRE'],
            'date_dépôt': new Date(), // TODO : choisir la bonne colonne qui renseigne de la date de première sollicitation (correspondant à la date dépôt de Pitchou),
            'commentaire_libre': commentaire_libre,
            date_consultation_public: dateDébutConsultation
        },
        évènement_phase_dossier: donnéesEvénementPhaseDossier,
        avis_expert: avisExpert,
        décision_administrative: décisionAdministrative
    }
}

/**
 *
 * @param {LigneDossierCorse} ligne
 * @param {string[]} warnings
 * @returns {PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesEvénementPhaseDossier(ligne, warnings) {
    /**@type {PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[]} */
    const donnéesEvénementPhaseDossier = []

    const valeurNormaliséeStatut = ligne['Statut'].trim().toLowerCase()
    const valeurDateDébutAccompagnement = ligne[`Date de début d'accompagnement`]

    if (valeurNormaliséeStatut === 'nouveau dossier à venir' || valeurNormaliséeStatut === 'diagnostic préalable' || valeurNormaliséeStatut === 'demande de compléments dossier') {
        donnéesEvénementPhaseDossier.push({phase: 'Accompagnement amont', horodatage: new Date(valeurDateDébutAccompagnement, 0, 1) })
    }

    if (valeurNormaliséeStatut === `rapport d'instruction`) {
        const valeurDateDeRéceptionDuDossierComplet = ligne['Date de réception du dossier complet']
        const datePhaseInstruction = valeurDateDeRéceptionDuDossierComplet.toString()

        if (isValidDateString(datePhaseInstruction)) {
            donnéesEvénementPhaseDossier.push({phase: 'Instruction', horodatage: new Date(datePhaseInstruction)})
        } else {
            const messageWarning = `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : ${datePhaseInstruction}. On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`
            console.warn(messageWarning)
            warnings.push(messageWarning)

        }
    }

    const valeurDateDeRéceptionPremierDossier = ligne['Date de réception 1er dossier']
    const dateReceptionPremierDossier = valeurDateDeRéceptionPremierDossier.toString()
    if (isValidDateString(dateReceptionPremierDossier)) {
        donnéesEvénementPhaseDossier.push({phase: 'Étude recevabilité DDEP', horodatage: new Date(dateReceptionPremierDossier)})
    }

    const valeurDateDeRéceptionDuDossierComplet = ligne['Date de réception du dossier complet']
    const datePhaseInstruction = valeurDateDeRéceptionDuDossierComplet.toString()
    if (isValidDateString(datePhaseInstruction)) {
        donnéesEvénementPhaseDossier.push({phase: 'Instruction', horodatage: new Date(datePhaseInstruction)})
    }

    return donnéesEvénementPhaseDossier.length >= 1 ? donnéesEvénementPhaseDossier : undefined
    
}

/**
 * Crée un objet dossier à partir d'une ligne d'import).
 * @param {LigneDossierCorse} ligne
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444 & { warnings: string[] }>>}
 */
export async function créerDossierDepuisLigne(ligne, activitésPrincipales88444) {
    /** @type {string[]} */
    let warnings = []

    const donnéesLocalisations =  await générerDonnéesLocalisations(ligne, warnings)
    const donnéesAutorisationEnvironnementale = générerDonnéesAutorisationEnvironnementale(ligne)

    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(créerDonnéesSupplémentairesDepuisLigne(ligne, warnings)),

        'Nom du projet': créerNomPourDossier(ligne),
        'Activité principale': convertirTypeDeProjetEnActivitéPrincipale(ligne, warnings, activitésPrincipales88444),
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        'Commune(s) où se situe le projet': donnéesLocalisations['Commune(s) où se situe le projet'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": donnéesAutorisationEnvironnementale["Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"],
        'À quelle procédure le projet est-il soumis ?': donnéesAutorisationEnvironnementale['À quelle procédure le projet est-il soumis ?'],
    

        warnings: warnings.length>=1 ? warnings : undefined,

    };
}

/**
 * Vérifie si un dossier spécifique à importer existe déjà dans la base de données.
 * La recherche s'effectue en comparant le nom du projet (champ 'nom' de la table 'dossier')
 * ainsi que le numéro Onagre.
 * On utilise le numéro Onagre car plusieurs projets du tableau possèdent le même nom de projet (colonne Libellé).
 * @param {LigneDossierCorse} ligne
 * @param {Set<string | null>} nomsEnBDD
 * @param {Map<string | null, string | null>} nomToHistoriqueIdentifiantDemandeOnagre
 * @returns {boolean}
 */
export function ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre) {
    const nom = créerNomPourDossier(ligne);
    const numéroOnagre = ligne["N°ONAGRE"];
    if (!nom || nom === "") {
        console.warn(
            `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(ligne)}`,
        );
        return false;
    }
    if (nomsEnBDD.has(nom)) {
        return (
            nomToHistoriqueIdentifiantDemandeOnagre.get(nom) ===
            numéroOnagre
        );
    } else {
        return false;
    }
}