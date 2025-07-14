//@ts-check

import parseArgs from 'minimist'
import {sub, format, formatDistanceToNow, isAfter} from 'date-fns'
import { fr } from "date-fns/locale"

import {dumpEntreprises, closeDatabaseConnection, créerTransaction, addRésultatSynchronisationDS88444} from '../scripts/server/database.js'
import {dumpDossiers, getDossierIdsFromDS_Ids, dumpDossierMessages, dumpDossierTraitements, synchroniserSuiviDossier, deleteDossierByDSNumber, synchroniserDossierDansGroupeInstructeur} from '../scripts/server/database/dossier.js'
import {listAllPersonnes, créerPersonnes} from '../scripts/server/database/personne.js'
import {synchroniserGroupesInstructeurs} from '../scripts/server/database/groupe_instructeurs.js'
import { ajouterFichiersEspècesImpactéesDepuisDS88444 } from '../scripts/server/database/espèces_impactées.js'

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/démarches-simplifiées/recupérerDossiersRécemmentModifiés.js'
import {recupérerGroupesInstructeurs} from '../scripts/server/démarches-simplifiées/recupérerGroupesInstructeurs.js'
import récupérerTousLesDossiersSupprimés from '../scripts/server/démarches-simplifiées/recupérerListeDossiersSupprimés.js'

import {isValidDate} from '../scripts/commun/typeFormat.js'

//import checkMemory from '../scripts/server/checkMemory.js'

import _schema88444 from '../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}
import {téléchargerNouveauxFichiersEspècesImpactées, téléchargerNouveauxFichiersAP_AM, téléchargerNouveauxFichiersMotivation} from './synchronisation-ds-88444/téléchargerNouveauxFichiersParType.js'
import { ajouterDémarchesAdministratives, miseÀJourDécisionsAdministrativesDepuisDS88444 } from '../scripts/server/database/décision_administrative.js'

/** @import {default as DatabaseDossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import {default as Personne, PersonneInitializer} from '../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../scripts/types/database/public/Entreprise.ts' */
/** @import {default as DécisionAdministrative} from '../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import {default as RésultatSynchronisationDS88444} from '../scripts/types/database/public/RésultatSynchronisationDS88444.ts' */
/** @import {default as Fichier} from '../scripts/types/database/public/Fichier.ts' */

/** @import {TypeDécisionAdministrative} from '../scripts/types/API_Pitchou.ts' */

/** @import {DémarchesSimpliféesCommune, ChampDSCommunes, ChampDSDépartements, ChampDSRégions, Message, ChampDSDépartement, DémarchesSimpliféesDépartement, ChampScientifiqueIntervenants, BaseChampDS} from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {DossierDS88444, Annotations88444, Champs88444} from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {SchemaDémarcheSimplifiée, ChampDescriptor} from '../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {DossierPourSynchronisation, DécisionAdministrativeAnnotation88444} from '../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */

// récups les données de DS

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

/** @type {number} */
const DEMARCHE_NUMBER = parseInt(process.env.DEMARCHE_NUMBER || "")
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const args = parseArgs(process.argv)

/** @type {Date} */
let lastModified;

if(typeof args.lastModified === 'string' && isValidDate(new Date(args.lastModified))){
    lastModified = new Date(args.lastModified)
}
else{
    lastModified = sub(new Date(), {hours: 12})
}

console.info(
    `Synchronisation des dossiers de la démarche`, 
    DEMARCHE_NUMBER, 
    'modifiés depuis le', 
    format(lastModified, 'd MMMM yyyy (HH:mm O) ', {locale: fr}),
    `(${formatDistanceToNow(lastModified, {locale: fr})})`
)

/** @type {SchemaDémarcheSimplifiée} */
// @ts-expect-error TS ne peut pas le savoir
const schema88444 = _schema88444

const laTransactionDeSynchronisationDS = await créerTransaction()


const dossSuppP = récupérerTousLesDossiersSupprimés(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)

const groupesInstructeursSynchronisés = recupérerGroupesInstructeurs(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)
    .then(groupesInstructeurs => synchroniserGroupesInstructeurs(groupesInstructeurs, laTransactionDeSynchronisationDS));


/** @type {DossierDS88444[]} */
const dossiersDS = await recupérerDossiersRécemmentModifiés(
    DEMARCHE_SIMPLIFIEE_API_TOKEN, 
    DEMARCHE_NUMBER, 
    lastModified
)


console.info('Nombre de dossiers', dossiersDS.length)

//console.log('3 dossiers', dossiersDS.slice(0, 3))
//console.log('dossier', dossiersDS.find(d => d.number === 25298686))



// stocker les dossiers en BDD

/** @type {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof DossierDemarcheSimplifiee88444 sont les schema88444.revision.champDescriptors.map(label)
const pitchouKeyToChampDS = new Map(schema88444.revision.champDescriptors.map(
    ({label, id}) => [label, id])
)

/** @type {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof AnnotationsPriveesDemarcheSimplifiee88444 sont les schema88444.revision.annotationDescriptors.map(label)
const pitchouKeyToAnnotationDS = new Map(schema88444.revision.annotationDescriptors.map(
    ({label, id}) => [label, id])
)

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes();
// const allEntreprisesCurrentlyInDatabase = listAllEntreprises();



/** @type {Map<DatabaseDossier['number_demarches_simplifiées'], DécisionAdministrativeAnnotation88444>} */
const donnéesDécisionAdministrativeParNuméroDossier = new Map();



/** @type {Omit<DossierPourSynchronisation, "demandeur_personne_physique" | "espèces_protégées_concernées" | "espèces_impactées" >[]} */
const dossiersPourSynchronisation = dossiersDS.map((
{
    id: id_demarches_simplifiées,
    number,
    dateDepot: date_dépôt, 
    demandeur,
    champs,
    annotations
}) => {
    /**
     * Meta données
     */
    const number_demarches_simplifiées = String(number)

    /*
        Déposant 

        Le déposant est la personne qui dépose le dossier sur DS
        Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique 
        qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose 
        le dossier
        Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur

        Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" 
        (qui est différent de notre "demandeur")

    */
    /** @type {PersonneInitializer} */
    let déposant;
    {
        const {prenom: prénoms, nom, email} = demandeur
        déposant = {
            prénoms,
            nom,
            email: email === '' ? undefined : email
        }
    }

    /** 
     * Champs 
     */
    /** @type {Map<string | undefined, Champs88444>} */
    /** @type {Map<string | undefined, any>} */
    const champById = new Map()
    for(const champ of champs){
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

    if(projetSitué === `d'une ou plusieurs communes` && champCommunes){
        communes = champCommunes.rows.map(c => c.champs[0].commune).filter(x => !!x)
        
        if(Array.isArray(communes) && communes.length >= 1){
            départements = [...new Set(champCommunes.rows.map(c => c.champs[0].departement?.code).filter(x => !!x))]
        }
    }
    else{
        if(projetSitué === `d'un ou plusieurs départements` && champDépartements){
            départements = [... new Set(champDépartements.rows.map(c => c.champs[0].departement?.code))]
        }
        else{
            if(projetSitué === `d'une ou plusieurs régions` && champRégions){
                régions = [... new Set(champRégions.rows.map(c => c.champs[0].stringValue))]
            }
            else{
                if(projetSitué === 'de toute la France'){
                    // ignorer
                }
                else{
                    if(!projetSitué){
                        // ignorer
                    }
                    else{
                        console.log('localisation manquante', projetSitué, champs)
                        process.exit(1)
                    }
                }
            }
        }
    }

    // Si la localisation avec les champs dédiés (surtout communes et départements) a échoué,
    // se rabattre sur le champ du département principal s'il est présent
    if(champDépartementPrincipal && champDépartementPrincipal.departement && (!départements || départements.length === 0)){
        départements = [champDépartementPrincipal.departement.code]
    }


    /*
        Demandeur
     
        Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */

    /** @type {PersonneInitializer | undefined} */
    /** let demandeur_personne_physique = undefined; */
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined
 
    const SIRETChamp = champById.get(pitchouKeyToChampDS.get('Numéro de SIRET'))
    if(SIRETChamp){
        const etablissement = SIRETChamp.etablissement
        if(etablissement){
            const { siret, address = {}, entreprise = {}} = etablissement
            const {streetAddress, postalCode, cityName} = address
            const {raisonSociale} = entreprise


            demandeur_personne_morale = {
                siret,
                raison_sociale: raisonSociale,
                adresse: `${streetAddress} ${postalCode} ${cityName}`
            }
        }
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

    if(rattaché_au_régime_ae_stringValue === 'Oui' || rattaché_au_régime_ae_stringValue === 'true'){
        rattaché_au_régime_ae = true;
    }
    if(rattaché_au_régime_ae_stringValue === 'Non' || rattaché_au_régime_ae_stringValue === 'false'){
        rattaché_au_régime_ae = false
    }

    /** Mesures ERC prévues */
    const mesures_erc_prévues_champ = champById.get(
        pitchouKeyToChampDS.get("Des mesures ERC sont-elles prévues ?")
    )
    const mesures_erc_prévues = mesures_erc_prévues_champ?.checked
    
    /** Données dossier scientifique */
    /** @type {DossierDemarcheSimplifiee88444['Recherche scientifique - Votre demande concerne :']} */
    const scientifique_type_demande_values = champById.get(pitchouKeyToChampDS.get('Recherche scientifique - Votre demande concerne :'))?.values
    
    /** @type {DossierDemarcheSimplifiee88444['Description du protocole de suivi']} */
    const scientifique_description_protocole_suivi = champById.get(pitchouKeyToChampDS.get('Description du protocole de suivi'))?.stringValue

    
    /** @type {DossierDemarcheSimplifiee88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`][]} */
    const scientifique_précisez_mode_capture_values = champById.get(pitchouKeyToChampDS.get(`En cas de nécessité de capture d'individus, précisez le mode de capture`))?.values

    /** @type {DossierDemarcheSimplifiee88444[`Préciser le(s) autre(s) moyen(s) de capture`]} */
    const scientifique_precisez_autre_capture = champById.get(pitchouKeyToChampDS.get(`Préciser le(s) autre(s) moyen(s) de capture`))?.stringValue

    /** @type {Set<DossierDemarcheSimplifiee88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`] | DossierDemarcheSimplifiee88444[`Préciser le(s) autre(s) moyen(s) de capture`]>} */
    const scientifique_mode_capture_set = scientifique_précisez_mode_capture_values ? new Set(scientifique_précisez_mode_capture_values) : new Set()
    
    if(scientifique_precisez_autre_capture){
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

    if(Array.isArray(rowsChamp)){
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
    for(const annotation of annotations){
        annotationById.set(annotation.id, annotation)
    }

    const historique_nom_porteur = annotationById.get(pitchouKeyToAnnotationDS.get("Nom du porteur de projet"))?.stringValue
    const historique_localisation = annotationById.get(pitchouKeyToAnnotationDS.get("Localisation du projet"))?.stringValue
    const ddep_nécessaire = annotationById.get(pitchouKeyToAnnotationDS.get("DDEP nécessaire ?"))?.stringValue

    const enjeu_écologique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu écologique")).checked
    const enjeu_politique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu politique")).checked
    const commentaire_enjeu = annotationById.get(pitchouKeyToAnnotationDS.get("Commentaires sur les enjeux et la procédure")).stringValue

    const historique_date_réception_ddep = annotationById.get(pitchouKeyToAnnotationDS.get("Date de réception DDEP")).date
        
    const historique_date_envoi_dernière_contribution = annotationById.get(pitchouKeyToAnnotationDS.get("Date d'envoi de la dernière contribution en lien avec l'instruction DDEP")).date
    const historique_identifiant_demande_onagre = annotationById.get(pitchouKeyToAnnotationDS.get("N° Demande ONAGRE")).stringValue

    const historique_date_saisine_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN")).date

    const historique_date_saisine_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN")) ?
        annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN")).date : 
        undefined
    
    
    const date_avis_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN")).date
    
    const date_avis_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN")) ?
        annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN")).date : 
        undefined



    const avis_csrpn_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Avis CSRPN/CNPN")).stringValue

    const date_consultation_public = annotationById.get(pitchouKeyToAnnotationDS.get("Date de début de la consultation du public ou enquête publique")).date

    
    const décision = annotationById.get(pitchouKeyToAnnotationDS.get("Décision")).stringValue
    const date_signature_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS.get("Date de signature de l'AP")).date
    const référence_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS.get("Référence de l'AP")).stringValue
    const date_signature_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS.get("Date de l'AM")).date
    const référence_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS.get("Référence de l'AM")).stringValue

    donnéesDécisionAdministrativeParNuméroDossier.set(number_demarches_simplifiées, {
        décision: décision || undefined,
        date_signature_arrêté_préfectoral: date_signature_arrêté_préfectoral ? new Date(date_signature_arrêté_préfectoral) : undefined,
        référence_arrêté_préfectoral: référence_arrêté_préfectoral || undefined,
        date_signature_arrêté_ministériel: date_signature_arrêté_ministériel ? new Date(date_signature_arrêté_ministériel) : undefined,
        référence_arrêté_ministériel: référence_arrêté_ministériel || undefined,
    })

    return {
        // méta-données
        id_demarches_simplifiées,
        number_demarches_simplifiées,
        date_dépôt,

        // demandeur/déposant
        // demandeur_personne_physique,
        demandeur_personne_morale,
        déposant,
        //représentant,

        // champs
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

        // données dossier scientifique
        scientifique_type_demande: scientifique_type_demande_values ? JSON.stringify(scientifique_type_demande_values) : undefined,
        scientifique_description_protocole_suivi,
        scientifique_mode_capture,
        scientifique_modalités_source_lumineuses,
        scientifique_modalités_marquage,
        scientifique_modalités_transport,
        scientifique_périmètre_intervention,
        scientifique_intervenants: JSON.stringify(scientifique_intervenants),
        scientifique_précisions_autres_intervenants,

        // annotations privées
        historique_nom_porteur,
        historique_localisation,
        ddep_nécessaire,

        enjeu_écologique,
        enjeu_politique,
        commentaire_enjeu,
        
        historique_date_réception_ddep,
        historique_date_envoi_dernière_contribution,
        historique_identifiant_demande_onagre,
        historique_date_saisine_csrpn,
        historique_date_saisine_cnpn,
        date_avis_csrpn,
        date_avis_cnpn,
        avis_csrpn_cnpn,
        
        date_consultation_public,

    }
    
})

/*
    Créer toutes les personnes manquantes en BDD pour qu'elles aient toutes un id
*/

/** @type {Map<Personne['email'], Personne>} */
const personneByEmail = new Map()
const allPersonnesCurrentlyInDatabase = await allPersonnesCurrentlyInDatabaseP

for(const personne of allPersonnesCurrentlyInDatabase){
    if(personne.email){
        personneByEmail.set(personne.email, personne)
    }
}

/** @type {Map<PersonneInitializer['email'], PersonneInitializer>} */
const personnesInDossiersAvecEmail = new Map()
const personnesInDossiersSansEmail = new Map()

for (const {déposant, /** demandeur_personne_physique */} of dossiersPourSynchronisation) {
    if (déposant) {
        if(déposant.email) {
            personnesInDossiersAvecEmail.set(déposant.email, déposant)
        } else {
            personnesInDossiersSansEmail.set(`${déposant.prénoms}|${déposant.nom}`, déposant)
        }
    }

    /** if (demandeur_personne_physique) {
        if(demandeur_personne_physique.email) {
            personnesInDossiersAvecEmail.set(demandeur_personne_physique.email, demandeur_personne_physique)
        } else {
            personnesInDossiersSansEmail.set(`${demandeur_personne_physique.prénoms}|${demandeur_personne_physique.nom}`, demandeur_personne_physique)
        }
    } */

}

/**
 * 
 * @param {Personne | undefined} descriptionPersonne 
 * @returns {Personne['id'] | undefined}
 */
function getPersonneId(descriptionPersonne){
    if(!descriptionPersonne){
        return undefined
    }

    if(descriptionPersonne.id){
        return descriptionPersonne.id
    }

    if(descriptionPersonne.email){
        const personne = personneByEmail.get(descriptionPersonne.email)
        return personne && personne.id
    }

    const personneParNomPrénom = allPersonnesCurrentlyInDatabase.find(
        ({email, nom, prénoms}) => !email && descriptionPersonne.nom === nom && descriptionPersonne.prénoms === prénoms
    )

    return personneParNomPrénom && personneParNomPrénom.id
}

const personnesInDossiersWithoutId = [...personnesInDossiersAvecEmail.values(), ...personnesInDossiersSansEmail.values()].filter(p => !getPersonneId(p))

// console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if(personnesInDossiersWithoutId.length >= 1){
    await créerPersonnes(personnesInDossiersWithoutId)
    .then((personneIds) => {
        personnesInDossiersWithoutId.forEach((p, i) => {
            p.id = personneIds[i].id
        })
    })
}

//console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

/*
    Rajouter les entreprises demandeuses qui ne sont pas déjà en BDD
*/

/** @type {Map<Entreprise['siret'], Entreprise>} */
const entreprisesInDossiersBySiret = new Map()

for(const {demandeur_personne_morale, id_demarches_simplifiées} of dossiersPourSynchronisation){
    if (demandeur_personne_morale) {
        const {siret} = demandeur_personne_morale
        if(demandeur_personne_morale && !siret){
            throw new TypeError(`Siret manquant pour l'entreprise ${JSON.stringify(demandeur_personne_morale)} (id_DS: ${id_demarches_simplifiées})`)
        }
        
        // @ts-expect-error TS ne comprend pas que demandeur_personne_morale est forcément une Entreprise
        entreprisesInDossiersBySiret.set(siret, demandeur_personne_morale)
    }
}

if(entreprisesInDossiersBySiret.size >= 1){
    await dumpEntreprises([...entreprisesInDossiersBySiret.values()])
}

/*
 * Après avoir créé les entreprises et les personnes, 
 * remplacer les objets Entreprise par leur siret
 * et les objets Personne par leur id
*/

/** @type {Partial<DatabaseDossier>[]} */
// @ts-ignore
const dossiers = dossiersPourSynchronisation.map(dossier => {
    const { 
        déposant,
        /** demandeur_personne_physique, */
        demandeur_personne_morale, 
        ...autresPropriétés
    } = dossier

    return {
        //@ts-expect-error on fait un peu nimps entre l'objet déposant construit à partir de DS et l'identifiant de personne
        déposant: getPersonneId(déposant) || null,
        //demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
        demandeur_personne_morale: 
            (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
        ...autresPropriétés,
    }
})


/** Télécharger les nouveaux fichiers espèces impactées */
/** @type {ChampDescriptor['id'] | undefined} */
const fichierEspècesImpactéeChampId = pitchouKeyToChampDS.get('Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes')

if(!fichierEspècesImpactéeChampId){
    throw new Error('fichierEspècesImpactéeChampId is undefined')
}

/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersEspècesImpactéesTéléchargésP = téléchargerNouveauxFichiersEspècesImpactées(
    dossiersDS, 
    fichierEspècesImpactéeChampId, 
    laTransactionDeSynchronisationDS
)


/** Télécharger les nouveaux arrêtés préfectoraux et ministériels depuis les annotations privées */
/** @type {ChampDescriptor['id'] | undefined} */
const fichierAP_AMAnnotationId = pitchouKeyToAnnotationDS.get('AP/AM')

if(!fichierAP_AMAnnotationId){
    throw new Error('fichierAP_AMAnnotationId is undefined')
}

/** @type {Promise<Map<DossierDS88444['number'], Fichier['id'][]> | undefined>} */
const fichiersAP_AMTéléchargésP = téléchargerNouveauxFichiersAP_AM(
    dossiersDS, 
    fichierAP_AMAnnotationId, 
    laTransactionDeSynchronisationDS
)


//console.log('avec fichier motivation', dossiersDS.filter(d => d.motivationAttachment).map(d => d.number))

/** Télécharger les nouveaux fichiers 'motivation' */
/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersMotivationTéléchargésP = téléchargerNouveauxFichiersMotivation(
    dossiersDS,
    laTransactionDeSynchronisationDS
)


/**
 * Synchronisation des dossiers
 */
let dossiersSynchronisés
if(dossiers.length >= 1){
    dossiersSynchronisés = dumpDossiers(dossiers)
}

const dossiersSupprimés = dossSuppP.then( dossiersSupp => deleteDossierByDSNumber(dossiersSupp.map(({number}) => number)))

await Promise.all([
    dossiersSynchronisés,
    dossiersSupprimés
])

/**
 * Après synchronisation des dossiers
 * 
 * Désormais, chaque dossier de la variable 'dossiers' avec un numéro de dossier DS 
 * a aussi un identifiant de dossier pitchou
 */



/**
 * Synchronisation de toutes les choses qui ont besoin d'un Dossier['id']
 */

const dossierIds = await getDossierIdsFromDS_Ids(dossiersDS.map(d => d.id))
/** @type {Map<NonNullable<DossierDS88444['id']>, DatabaseDossier['id']>} */
const dossierIdByDS_id = new Map()
/** @type {Map<DossierDS88444['number'], DatabaseDossier['id']>} */
const dossierIdByDS_number = new Map()

for(const {id, id_demarches_simplifiées, number_demarches_simplifiées} of dossierIds){
    dossierIdByDS_id.set(id_demarches_simplifiées, id)
    dossierIdByDS_number.set(Number(number_demarches_simplifiées), id)
}



/** Synchronisation de la messagerie */

/** @type {Map<NonNullable<DatabaseDossier['id_demarches_simplifiées']>, Message[]>} */
const messagesÀMettreEnBDDAvecDossierId_DS = new Map(dossiersDS.map(
    ({id: id_DS, messages}) => [id_DS, messages])
)


let messagesSynchronisés;

/** @type {Map<DatabaseDossier['id'], Message[]>} */
const messagesÀMettreEnBDDAvecDossierId = new Map()
for(const [id_DS, messages] of messagesÀMettreEnBDDAvecDossierId_DS){
    const dossierId = dossierIdByDS_id.get(id_DS)

    // @ts-ignore
    messagesÀMettreEnBDDAvecDossierId.set(dossierId, messages)
}

if(messagesÀMettreEnBDDAvecDossierId.size >= 1){
    messagesSynchronisés = dumpDossierMessages(messagesÀMettreEnBDDAvecDossierId)
}


/** Synchronisation suivi dossier et dossier dans groupeInstructeur */

let synchronisationSuiviDossier;
let synchronisationDossierDansGroupeInstructeur;

if(dossiersDS.length >= 1){
    /** Synchronisation de l'information des dossiers suivis */
    synchronisationSuiviDossier = synchroniserSuiviDossier(dossiersDS, laTransactionDeSynchronisationDS);

    /** Synchronisation de l'information de quel dossier appartient à quel groupe_instructeurs */
    synchronisationDossierDansGroupeInstructeur = synchroniserDossierDansGroupeInstructeur(dossiersDS, laTransactionDeSynchronisationDS);
}



/** Synchronisation des évènements de changement de phase */

/** @type {Map<NonNullable<DossierDS88444['number']>, DossierDS88444['traitements']>} */
const traitementsByNumberDS = new Map(dossiersDS.map(
    ({number, traitements}) => [number, traitements])
)


let traitementsSynchronisés;

/** @type {Map<DatabaseDossier['id'], DossierDS88444['traitements']>} */
const idToTraitements = new Map()

for(const [number, traitements] of traitementsByNumberDS){
    const dossierId = dossierIdByDS_number.get(number)

    if(!dossierId)
        throw new Error(`Dossier.id manquant pour dossier DS numéro ${number}`)

    idToTraitements.set(dossierId, traitements)
}

if(idToTraitements.size >= 1){
    traitementsSynchronisés = dumpDossierTraitements(idToTraitements, laTransactionDeSynchronisationDS)
}


/** Synchronisation des décisions administratives */
/*
    Les fichiers téléchargés correspondent à ceux qui n'avaient pas été téléchargés et donc sûrement à
    une nouvelle décision administrative qui n'est pas encore en BDD

    On utilise le dernier traitement du dossier pour déterminer le type de décision administrative (acceptation, refus)
*/
let décisionsAdministrativesSynchronisées = fichiersMotivationTéléchargésP.then(fichiersMotivationTéléchargés => {
    if(fichiersMotivationTéléchargés && fichiersMotivationTéléchargés.size >= 1){
        /** @type {Omit<DécisionAdministrative, 'id'>[]} */
        const décisionsAdministratives = []

        for(const [numéroDS, fichierMotivationId] of fichiersMotivationTéléchargés){
            /** @type {TypeDécisionAdministrative} */
            let type = 'Autre décision';

            const traitements = traitementsByNumberDS.get(numéroDS)
            if(!traitements){
                throw new Error(`Traitements manquants pour dossier DS numéro ${numéroDS}`)
            }

            let dernierTraitement = traitements[0];

            for(const traitement of traitements){
                if(isAfter(traitement.dateTraitement, dernierTraitement.dateTraitement)){
                    dernierTraitement = traitement
                }
            }

            if(dernierTraitement.state === 'accepte')
                type = 'Arrêté dérogation'

            if(dernierTraitement.state === 'refuse')
                type = 'Arrêté refus'

            const dossierId = dossierIdByDS_number.get(numéroDS)
            if(!dossierId){
                throw new Error(`Dossier id manquant pour dossier DS numéro ${numéroDS}`)
            }

            décisionsAdministratives.push({
                dossier: dossierId,
                fichier: fichierMotivationId,
                type,
                // pas correct, mais approximation sûrement suffisante pour commencer
                // Les instructeur.rices pourront corriger manuellement a posteriori
                date_signature: new Date(dernierTraitement.dateTraitement),
                numéro: null,
                date_fin_obligations: null
            })
        }
        
        return ajouterDémarchesAdministratives(décisionsAdministratives, laTransactionDeSynchronisationDS)
    }
})




/** Synchronisation des fichiers espèces impactées téléchargés */

const fichiersEspècesImpactéesSynchronisés = fichiersEspècesImpactéesTéléchargésP.then(fichiersEspècesImpactéesTéléchargés => {
    if(fichiersEspècesImpactéesTéléchargés && fichiersEspècesImpactéesTéléchargés.size >= 1){
        //checkMemory()

        return ajouterFichiersEspècesImpactéesDepuisDS88444(
            fichiersEspècesImpactéesTéléchargés,
            laTransactionDeSynchronisationDS
        )
    }
})


/** Synchronisation des fichiers AP/AM téléchargés */


const fichiersAP_AMSynchronisés = fichiersAP_AMTéléchargésP.then(fichiersAP_AMTéléchargés => {
    if(fichiersAP_AMTéléchargés && fichiersAP_AMTéléchargés.size >= 1){
        //checkMemory()
        console.log('fichiersAP_AMTéléchargés', fichiersAP_AMTéléchargés.size)
        //console.log('fichiersAP_AMTéléchargés', fichiersAP_AMTéléchargés)

        return miseÀJourDécisionsAdministrativesDepuisDS88444(
            fichiersAP_AMTéléchargés,
            // @ts-ignore
            dossiers,
            dossierIdByDS_number,
            donnéesDécisionAdministrativeParNuméroDossier,
            laTransactionDeSynchronisationDS
        )
    }
})



/** Fin de l'outil de synchronisation - fermeture */

Promise.all([
    groupesInstructeursSynchronisés,
    messagesSynchronisés,
    traitementsSynchronisés,
    décisionsAdministrativesSynchronisées,
    synchronisationSuiviDossier,
    synchronisationDossierDansGroupeInstructeur,
    fichiersEspècesImpactéesSynchronisés,
    fichiersAP_AMSynchronisés
])
.then(() => {
    console.log('Sync terminé avec succès, commit de la transaction')

    /** @type {RésultatSynchronisationDS88444} */
    const résultatSynchro = {
        succès: true,
        horodatage: new Date(),
        erreur: null
    }

    return Promise.allSettled([
        addRésultatSynchronisationDS88444(résultatSynchro),
        laTransactionDeSynchronisationDS.commit()
    ])
})
.catch(err => {
    console.error('Sync échoué', err,  'rollback de la transaction')
    
    /** @type {RésultatSynchronisationDS88444} */
    const résultatSynchro = {
        succès: false,
        horodatage: new Date(),
        erreur: err.toString()
    }

    return Promise.allSettled([
        addRésultatSynchronisationDS88444(résultatSynchro),
        laTransactionDeSynchronisationDS.rollback()
    ])
})
.then(() => {
    console.log('Fin de la synchronisation, cloture de la connexion avec la base de données')
    return closeDatabaseConnection()
})

