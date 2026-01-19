/** @import { DossierDemarcheNumerique88444 } from "../../types/démarche-numérique/Démarche88444" */
/** @import { DonnéesSupplémentairesPourCréationDossier, Alerte, DossierAvecAlertes } from "./importDossierUtils" */
/** @import { DossierComplet } from "../../types/API_Pitchou" */
/** @import {VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer}  from '../../types/database/public/ÉvènementPhaseDossier' */
/** @import { PartialBy }  from '../../types/tools' */
/** @import {AvisExpertInitializer}  from '../../types/database/public/AvisExpert' */
/** @import {DCisionAdministrativeInitializer as DécisionAdministrativeInitializer}  from '../../types/database/public/DécisionAdministrative' */

import { isDate } from "date-fns";
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
 *   "Fin de publication": string;
 *   "Numéro AP": string;
 *   "Date AP": string | Date;
 *   "Commentaires post AP": string;
 * }} LigneDossierCorse // D'après le tableau envoyé le 25/07/2025
 */

const demandeurToSiret = new Map([
  ["ADIMAT", "33358398700032"],
  ["AÉROPORT DE CALVI", "30638506300038"],
  ["AKUO ENERGIE CORSE", "50518633800057"],
  ["ALTA PISCIA", "80130439500024"],
  ["AVENIR AGRICOLE", "30483961600014"],
  ["BETAG", "42228223600047"],
  ["BRANZIZI IMMOBILIER", "43941568800043"],
  ["CAPA", "24201005600073"],
  ["CCSC", "20004076400041"],
  ["CD2A", "20007695800012"],
  ["CDC PATRIMOINE", "20007695800012"],
  ["CDC ROUTES", "20007695800012"],
  ["CG2A", "20007695800012"],
  ["CLOS DES AMANDIERS", "91095159900018"],
  ["COMMUNAUTÉ DE COMMUNES DU SUD CORSE", "20004076400041"],
  ["CONSERVATOIRE DU LITTORAL", "18000501900435"],
  ["CONSTRUCTION DU CAP", "49722037600022"],
  ["CORSE TRAVAUX", "33046450400043"],
  ["CORSEA PROMOTION", "82329102600016"],
  ["CORSICA ENERGIA", "88097833300016"],
  ["CORSICA SOLE", "88802711700017"],
  ["COSICA SOLE", null], // FAUTE DE FRAPPE
  ["DGAC", "13000577000081"],
  ["EDF", "55208131722061"],
  ["EDF PEI", "48996768700083"],
  ["EDF SEI", "55208131722061"],
  ["ERILIA", "5881167000064"],
  ["ISONI – DELTA BOIS", "48181865600011"],
  ["LANFRANCHI ENVIRONNEMENT", "50060870800037"],
  ["LE LOGIS CORSE", "31028856800051"],
  ["M.MORETTI", null],
  ["MAIRIE D'AMBIEGNA", "21200014500012"],
  ["MAIRIE DE BIGUGLIA", "21200037600013"],
  ["MAIRIE DE BORGO", "21200042600016"],
  ["MAIRIE DE CARGÈSE", "21200065700016"],
  ["MAIRIE DE PROPRIANO", "21200249700015"],
  ["MAIRIE GHISONACCIA", "21200123400013"],
  ["MINISTÈRE DES ARMÉES", "11009001600046"],
  ["OEHC", "33043264200016"],
  ["PARTICULIER", null],
  ["PROBAT", "42987846500021"],
  ["ROCCA FORTIMMO", "82334498100019"],
  ["ROCH LEANDRI", "45063550300037"],
  ["SACOI 3", "94471240500025"],
  ["SARL LANFRANCHI", "80815975000013"],
  ["SAS CAP SUD", "89229827400028"],
  ["SAS LDP IMMOBILIER", "79806317800015"],
  ["SAS ORIENTE ENVIRONNEMENT", "80970465300017"],
  ["SAS U FURNELLU", "51065127600014"],
  ["SAS VICTORIA CORP", "79960399800011"],
  ["SASU CANALE", "90182617200016"],
  ["SCCV DE L’ÉTANG D’ARASU", "81963241500017"],
  ["SCCV FORTIMMO (ROCCA)", "82334498100019"],
  ["SCCV LES RÉSIDENCES DE LA CRUCIATA", "82408014700013"],
  ["SCI COLOMBA - JEAN PERALDI", "50375429300010"],
  ["SCI RIVA BELLA", "80092305400012"],
  ["SCI RIVA BIANCA", "89338924700014"],
  ["SCVV RÉSIDENCE DU STILETTO (ROCCA)", "81320821200015"],
  ["SGBC", "33966853500059"],
  ["SNC MULINU D’ORZU", "82149158600011"],
  ["SSCB", "60675001600028"],
  ["SSCV DOMAINE DES OLIVIERS", "88036615800025"],
  ["STANECO", "39991981000024"],
  ["STOC (GROUPE PETRONI)", "39849006000025"],
  ["SUN’R", "50142867600305"],
  ["SYNDICAT RÉSIDENCE PANCRAZI", "84944461700013"],
  ["SYVADEC", "20000982700037"],
  ["TS PROMOTION", "82966042200017"],
  ["UNIVERSITÉ DE CORSE", "19202664900264"]
]);


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
 * @type {Map<TypeDeProjetOptions,  DossierDemarcheNumerique88444['Activité principale']>}
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
 * @param {Set<DossierDemarcheNumerique88444['Activité principale']>} activitésPrincipales88444
 * @returns {{ data: DossierDemarcheNumerique88444['Activité principale'], alertes: Alerte[] }}
 */
function convertirTypeDeProjetEnActivitéPrincipale(ligne, activitésPrincipales88444) {
    /** @type {Alerte[]} */
    const alertes = []
    const typeDeProjet = ligne['Type de projet'].trim()

    // Si le type de projet est déjà une valeur pitchou
    // @ts-ignore
    if (activitésPrincipales88444.has(typeDeProjet)) {
        // ts ne reconnaît pas le type de typeDeProjet
        // @ts-ignore
        return { data: typeDeProjet, alertes }
    }

    const activité = correspondanceTypeDeProjetVersActivitéPrincipale.get(    /** @type {TypeDeProjetOptions} */(typeDeProjet))
    if (activité) {
        return { data: activité, alertes }
    }

    const messageAlerte = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`
    console.warn(messageAlerte);
    alertes.push({ type: 'avertissement', message: messageAlerte })

    return { data: 'Autre', alertes: alertes };
}

/**
 * @param {LigneDossierCorse} ligne
 * @returns {Pick<DossierDemarcheNumerique88444, "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?" | "À quelle procédure le projet est-il soumis ?">}
 */
function générerDonnéesAutorisationEnvironnementale(ligne) {
    const type_de_projet = ligne['Type de projet'].toLowerCase();

    const valeurServicePilote = ligne['Service Pilote'].trim().toUpperCase()

    if (type_de_projet.includes('icpe')) {
        return {
            "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Oui',
            "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE"]
        };
    }     
    
    if (valeurServicePilote === 'SBEP') {
        return {
            "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Oui',
            "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE", "Autorisation loi sur l'eau"]
        };
    }

    return {
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Non',
        "À quelle procédure le projet est-il soumis ?": []
    };
}

/**
 *
 * @param {{ Commune: string | undefined, Département: number | string }} ligne
 *
 * @returns {Promise<{
 *   data: Partial<Pick<DossierDemarcheNumerique88444,
 *     "Commune(s) où se situe le projet" |
 *     "Département(s) où se situe le projet" |
 *     "Le projet se situe au niveau…"
 *   >> &
 *   Pick<DossierDemarcheNumerique88444,
 *     "Dans quel département se localise majoritairement votre projet ?"
 *   >,
 *   alertes: Alerte[]
 * }>}
 */
async function générerDonnéesLocalisations(ligne) {
    const départementParDéfaut = {code: '2A', nom: 'Corse-du-Sud'}

    const valeursCommunes = extraireCommunes(ligne['Commune'] ?? '');

    const communesPs = valeursCommunes.map((com) => getCommuneData(com));
    const départementsP = formaterDépartementDepuisValeur(ligne['Département']);

    const [résultatDépartements, communesResult] = await Promise.all([
        départementsP,
        Promise.all(communesPs),
    ]);


    const communes = communesResult.map((communeResult) => communeResult.data)
                                   .filter((commune) => commune !== null);
    const alertesCommunes = communesResult.map((communeResult) => communeResult.alerte)
                                   .filter((alerte) => alerte!==undefined)
    let alertes = [
        ...alertesCommunes,
        ...résultatDépartements.alertes,
    ]
    const départementsTrouvés = résultatDépartements.data
    const départementColonne = Array.isArray(départementsTrouvés) && départementsTrouvés[0] ? 
        départementsTrouvés[0] : 
        undefined

    /** @type {(
     *   Partial<Pick<DossierDemarcheNumerique88444,
     *     "Commune(s) où se situe le projet" |
     *     "Département(s) où se situe le projet" |
     *     "Le projet se situe au niveau…"
     *   >> &
     *   Pick<DossierDemarcheNumerique88444,
     *     "Dans quel département se localise majoritairement votre projet ?"
     *   >
     * )} */
    // @ts-ignore
    let data = {};

    if (communes.length >= 1) {
        const départementPremièreCommune = communes[0].departement

        data = {
            "Commune(s) où se situe le projet": communes,
            "Département(s) où se situe le projet": undefined,
            "Le projet se situe au niveau…": "d'une ou plusieurs communes",
            "Dans quel département se localise majoritairement votre projet ?": départementColonne ?? départementPremièreCommune
        }
    } else {
        if (alertesCommunes.length >= 1) {
            alertes.push({message: `Au moins une commune a été spécifiée pour cette ligne, mais aucune n'a été trouvée.`, type: 'erreur'})
        }
        const départements =  Array.isArray(départementsTrouvés) ? départementsTrouvés : [départementParDéfaut]
        data = {
            "Commune(s) où se situe le projet": undefined,
            "Département(s) où se situe le projet": départements,
            "Le projet se situe au niveau…": "d'un ou plusieurs départements",
            "Dans quel département se localise majoritairement votre projet ?": départements[0]
        }
    }

    return {
        alertes,
        data
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
    const valeurDateDépôtSurOnagre = ligne['Date de dépôt sur ONAGRE']
    /** @type {AvisExpertInitializer['date_saisine']} */
    let date_saisine

    if (isDate(valeurDateDépôtSurOnagre)) {
        date_saisine = new Date(valeurDateDépôtSurOnagre)
    } 

    if (expert!=='' || avis!== '') {
        return [{avis, date_avis, expert, date_saisine}]
    }

    if (date_saisine) {
        return [{date_saisine}]
    }
}

/**
 *
 * @param {LigneDossierCorse} ligne
 * @returns {{data: PartialBy<DécisionAdministrativeInitializer, 'dossier'>[], alertes: Alerte[]} | undefined}
 */
function créerDonnéesDécisionAdministrative(ligne) {
    const valeurDateAP = ligne['Date AP']

    if (!(!valeurDateAP || typeof valeurDateAP === 'string' && valeurDateAP === '')) {
        if (isValidDateString(valeurDateAP.toString())) {
            return {data: [{date_signature: new Date(valeurDateAP), type: 'Autre décision', numéro: ligne['Numéro AP']}], alertes: []}
        } else {
            const message = `La date indiquée dans la colonne Date AP est incorrecte : ${valeurDateAP}. On n'importe donc pas de décision administrative.`
            return {alertes: [{message, type: 'erreur' }], data: []}
        }

    }
}

/**
 * 
 * @param {LigneDossierCorse} ligne 
 * @returns {DossierComplet['prochaine_action_attendue_par'] | undefined}
 */
function créerDonnéesProchaineActionAttenduePar(ligne) {
    const valeurNiveauDAvancement = ligne["Niveau d'avancement"].trim()

    if (valeurNiveauDAvancement === 'A faire') {
        return 'Instructeur'
    }

    if (valeurNiveauDAvancement === 'En attente') {
        return 'Autre'
    }

    return undefined
}

/**
 * 
 * @param {LigneDossierCorse} ligne 
 * @returns { {data?: string, alertes?: Alerte[]} | undefined }
 */
function créerDonnéeDemandeurPersonneMorale(ligne) {
    const valeurNomDuDemandeur = ligne['Nom du demandeur'].trim().toUpperCase()
    if (valeurNomDuDemandeur !== '') {
        const siret = demandeurToSiret.get(valeurNomDuDemandeur)
        if (!siret) {
            return {alertes: [{type: 'avertissement', message: `La colonne "Nom du demandeur" a pour valeur "${valeurNomDuDemandeur} mais aucun siret correspondant n'a été trouvé."`}]}
        } else {
            return {data: siret}
        }
    }

}

/**
 * @typedef SousCommentaireDansCommentaireLibre
 * @property {string} titre
 * @property {string | undefined} commentaire
 */

/**
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * @param {LigneDossierCorse} ligne
 * @returns { DonnéesSupplémentairesPourCréationDossier & { alertes: Alerte[] } }
 */
function créerDonnéesSupplémentairesDepuisLigne(ligne) {
    const résultatsDonnéesEvénementPhaseDossier = créerDonnéesEvénementPhaseDossier(ligne)


    const avisExpert = créerDonnéesAvisExpert(ligne)

    /** @type {SousCommentaireDansCommentaireLibre} */
    const commentairePhaseInstruction = {titre: 'Commentaire phase instruction', commentaire: ligne['Commentaires phase instruction']}
    /** @type {SousCommentaireDansCommentaireLibre} */
    const commentairePostAP = {titre: 'Commentaires post AP', commentaire: ligne['Commentaires post AP']}
    /** @type {SousCommentaireDansCommentaireLibre} */
    const commentaireRemarques = {titre: 'Remarques', commentaire: ligne['Remarques']}
    
    const commentaire_libre = [commentairePhaseInstruction, commentairePostAP, commentaireRemarques]
        .filter(value => value?.commentaire?.trim())
        .map(({titre, commentaire}) => `${titre} : ${commentaire}`)
        .join('\n');


    const résultatsDécisionAdministrative = créerDonnéesDécisionAdministrative(ligne)

    const dateDébutConsultation = isValidDateString(ligne['Début consultation']) ? new Date(ligne['Début consultation']) : undefined
    const dateFinConsultation = isValidDateString(ligne['Fin de publication']) ? new Date(ligne['Fin de publication']) : undefined

    const prochaineActionAttenduePar = créerDonnéesProchaineActionAttenduePar(ligne)

    const résultatDemandeurPersonneMorale = créerDonnéeDemandeurPersonneMorale(ligne)
    /** @type {string | undefined} */
    const demandeurPersonneMorale = résultatDemandeurPersonneMorale?.data

    const alertes = [...(résultatsDonnéesEvénementPhaseDossier?.alertes ?? []), ...(résultatsDécisionAdministrative?.alertes ?? []), ...(résultatDemandeurPersonneMorale?.alertes ?? [])] 

    return {
        dossier: {
            'historique_identifiant_demande_onagre': ligne['N°ONAGRE'],
            'date_dépôt': new Date(), // TODO : choisir la bonne colonne qui renseigne de la date de première sollicitation (correspondant à la date dépôt de Pitchou),
            'commentaire_libre': commentaire_libre,
            date_debut_consultation_public: dateDébutConsultation,
            date_fin_consultation_public: dateFinConsultation,
            prochaine_action_attendue_par: prochaineActionAttenduePar,
            // @ts-ignore
            demandeur_personne_morale: demandeurPersonneMorale,
        },
        évènement_phase_dossier: résultatsDonnéesEvénementPhaseDossier?.data,
        alertes,
        avis_expert: avisExpert,
        décision_administrative: résultatsDécisionAdministrative?.data,
    }
}

/**
 *
 * @param {LigneDossierCorse} ligne
 * @returns {{data: PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[], alertes: Alerte[]} | undefined}
 */
function créerDonnéesEvénementPhaseDossier(ligne) {
    /**@type {PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[]} */
    const donnéesEvénementPhaseDossier = []

    /**@type {Alerte[]} */
    let alertes = []

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
            const messageAlerte = `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : "${datePhaseInstruction}". On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`
            console.warn(messageAlerte)
            alertes.push({message: messageAlerte, type: 'erreur'})

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
    
    return donnéesEvénementPhaseDossier.length >= 1 ? {
        data: donnéesEvénementPhaseDossier,
        alertes,
    } : undefined
    
}

/**
 * Crée un objet dossier à partir d'une ligne d'import).
 * @param {LigneDossierCorse} ligne
 * @param {Set<DossierDemarcheNumerique88444['Activité principale']>} activitésPrincipales88444
 * @returns {Promise<DossierAvecAlertes>}}}
 */
export async function créerDossierDepuisLigne(ligne, activitésPrincipales88444) {
    const { data: donnéesLocalisations, alertes: alertesLocalisation } =  await générerDonnéesLocalisations(ligne)
    const { data: activitéPrincipale, alertes: alertesActivité } = convertirTypeDeProjetEnActivitéPrincipale(ligne, activitésPrincipales88444)
    const donnéesAutorisationEnvironnementale = générerDonnéesAutorisationEnvironnementale(ligne)

    const {alertes: alertesDonnéesSupplémentaires, ...donnéesSupplémentairesDepuisLigne} = créerDonnéesSupplémentairesDepuisLigne(ligne)
    
    const alertes = [
        ...alertesLocalisation,
        ...alertesActivité,
        ...alertesDonnéesSupplémentaires
    ]
    
    return {
        'Nom du projet': créerNomPourDossier(ligne),
        'Activité principale': activitéPrincipale,
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        'Commune(s) où se situe le projet': donnéesLocalisations['Commune(s) où se situe le projet'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": donnéesAutorisationEnvironnementale["Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"],
        'À quelle procédure le projet est-il soumis ?': donnéesAutorisationEnvironnementale['À quelle procédure le projet est-il soumis ?'],
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(donnéesSupplémentairesDepuisLigne),
        
        alertes
    }
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