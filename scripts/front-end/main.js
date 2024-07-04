//@ts-check

import page from 'page'

import {csv, dsv, json} from 'd3-fetch'

import LoginViaEmail from './components/LoginViaEmail.svelte';
import SuiviInstruction from './components/SuiviInstruction.svelte';
import SaisieEspèces from './components/SaisieEspèces.svelte';
import Dossier from './components/Dossier.svelte';
import ImportHistoriqueNouvelleAquitaine from './components/ImportHistoriqueNouvelleAquitaine.svelte';

import { replaceComponent } from './routeComponentLifeCycle.js'
import store from './store.js'

import {init, secretFromURL, logout, chargerDossiers} from './actions/main.js'
import {envoiEmailConnexion} from './serveur.js'

import { authorizedEmailDomains } from '../commun/constantes.js';
import { normalizeNomCommune } from '../commun/typeFormat.js';
import { espèceProtégéeStringToEspèceProtégée, isClassif } from '../commun/outils-espèces';

/** @import {DossierDémarcheSimplifiée88444, DossierTableauSuiviNouvelleAquitaine2023, GeoAPICommune, GeoAPIDépartement} from "../types.js" */



const svelteTarget = document.querySelector('.svelte-main')

function showLoginByEmail(){
    function mapStateToProps(){
        return {
            authorizedEmailDomains,
            envoiEmailConnexion: envoiEmailConnexion
        }
    }

    const loginViaEmail = new LoginViaEmail({
        target: svelteTarget,
        props: mapStateToProps()
    });

    replaceComponent(loginViaEmail, mapStateToProps)
}


page('/', async () => {
    console.info('route', '/')
    await secretFromURL()
    if(!store.state.dossiers){
        await chargerDossiers()
            .catch(err => {
                if(err.message.includes('403')){
                    console.info('Invalid token. Logout.')
                }
                else{
                    console.error('Erreur de chargement des dossiers', err)
                }
                logout().then(showLoginByEmail)
            })
    }

    if(store.state.dossiers){
        function mapStateToProps({dossiers}){
            return {dossiers}
        }    
        
        const suiviInstructeur = new SuiviInstruction({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(suiviInstructeur, mapStateToProps)

    }
    else{
        showLoginByEmail()
    }

})

page('/dossier/:dossierId', ({params: {dossierId}}) => {
    /**
     * 
     * @param {import('./store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps({dossiers}){
        const dossierIdNb = Number(dossierId)

        return {dossier: dossiers.find(({id}) => id === dossierIdNb)}
    }   
    
    const dossier = new Dossier({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(dossier, mapStateToProps)

})

page('/saisie-especes', async () => {
    /**
     * @param {string} selector 
     * @returns {string}
     */
    function getURL(selector){
        const element = document.head.querySelector(selector)
    
        if(!element){
            throw new TypeError(`Élément ${selector} manquant`)
        }
    
        const hrefAttribute = element.getAttribute('href')
    
        if(!hrefAttribute){
            throw new TypeError(`Attribut "href" manquant sur ${selector}`)
        }
    
        return hrefAttribute
    }
    
    /** @type { [EspèceProtégéeStrings[], ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[], GroupesEspèces] } */
    // @ts-ignore
    const [dataEspèces, activites, methodes, transports, groupesEspècesBrutes] = await Promise.all([
        dsv(";", getURL('link#especes-data')),
        dsv(";", getURL('link#activites-data')),
        dsv(";", getURL('link#methodes-data')),
        dsv(";", getURL('link#transports-data')),
        json(getURL('link#groupes-especes-data')),
    ])


    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    const activitesParClassificationEtreVivant = new Map()
    for(const activite of activites){
        const classif = activite['Espèces']

        if(!classif.trim() && !activite['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}}`)
        }
        
        const classifActivz = activitesParClassificationEtreVivant.get(classif) || []
        classifActivz.push(activite)
        activitesParClassificationEtreVivant.set(classif, classifActivz)
    }

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    const méthodesParClassificationEtreVivant = new Map()
    for(const methode of methodes){
        const classif = methode['Espèces']

        if(!classif.trim() && !methode['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}`)
        }
        
        const classifMeth = méthodesParClassificationEtreVivant.get(classif) || []
        classifMeth.push(methode)
        méthodesParClassificationEtreVivant.set(classif, classifMeth)
    }

    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    const transportsParClassificationEtreVivant = new Map()
    for(const transport of transports){
        const classif = transport['Espèces']

        if(!classif.trim() && !transport['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`)
        }
        
        const classifTrans = transportsParClassificationEtreVivant.get(classif) || []
        classifTrans.push(transport)
        transportsParClassificationEtreVivant.set(classif, classifTrans)
    }

    /** @type {Map<ClassificationEtreVivant, EspèceProtégée[]>} */
    const espècesProtégéesParClassification = new Map()
    /** @type {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} */
    const espèceByCD_REF = new Map()

    for(const espStr of dataEspèces){
        const {classification} = espStr

        if(!isClassif(classification)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classification}.}`)
        }

        const espèces = espècesProtégéesParClassification.get(classification) || []

        /** @type {EspèceProtégée} */
        const espèce = Object.freeze(espèceProtégéeStringToEspèceProtégée(espStr))

        espèces.push(espèce)
        espèceByCD_REF.set(espèce['CD_REF'], espèce)

        espècesProtégéesParClassification.set(classification, espèces)
    }

    console.log('espècesProtégéesParClassification', espècesProtégéesParClassification)

    /**
     *
     * @param {string} s // utf-8-encoded base64 string
     * @returns {string} // cleartext string
     */
    function b64ToUTF8(s) {
        return decodeURIComponent(escape(atob(s)))
    }





    /**
     * 
     * @param { DescriptionMenaceEspècesJSON } descriptionMenacesEspècesJSON
     * @returns { DescriptionMenaceEspèce[] }
     */
    function descriptionMenacesEspècesFromJSON(descriptionMenacesEspècesJSON){
        //@ts-ignore
        return descriptionMenacesEspècesJSON.map(({classification, etresVivantsAtteints}) => {
            console.log('classification, etresVivantsAtteints', classification, etresVivantsAtteints)
            return {
                classification, 
                etresVivantsAtteints: etresVivantsAtteints.map(({espèce, activité, méthode, transport, ...rest}) => ({
                    espèce: espèceByCD_REF.get(espèce),
                    activité: activites.find((a) => a.Code === activité),
                    méthode: methodes.find((m) => m.Code === méthode),	
                    transport: transports.find((t) => t.Espèces === classification && t.Code === transport),
                    ...rest
                })), 
                
            }
        })
    }

    function importDescriptionMenacesEspècesFromURL(){
        const urlData = new URLSearchParams(location.search).get('data')
        if(urlData){
            try{
                const data = JSON.parse(b64ToUTF8(urlData))
                const desc = descriptionMenacesEspècesFromJSON(data)
                console.log('desc', desc)
                return desc
            }
            catch(e){
                console.error('Parsing error', e, urlData)
                return undefined
            }
        }
    }

    /** @type {Map<NomGroupeEspèces, EspèceProtégée[]>} */
    const groupesEspèces = new Map()
    for(const [nomGroupe, espèces] of Object.entries(groupesEspècesBrutes)){
        groupesEspèces.set(
            nomGroupe,
            //@ts-ignore TS doesn't understand what happens with .filter
            espèces.map(e => {
                if(typeof e === 'string'){
                    return undefined
                }
    
                return espèceByCD_REF.get(e['CD_REF']) // may be undefined and that's ok
            })
            .filter(x => !!x)
        )
    }


    function mapStateToProps(){
        return {
            espècesProtégéesParClassification,
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant,
            groupesEspèces,
            /** @type {DescriptionMenaceEspèce[]} */
            // @ts-ignore
            descriptionMenacesEspèces: importDescriptionMenacesEspècesFromURL() || [
                {
                    classification: "oiseau", // Type d'espèce menacée
                    etresVivantsAtteints: [],
                    activité: undefined, // Activité menaçante
                    méthode: undefined, // Méthode menaçante
                    transport: undefined // Transport impliqué dans la menace
                },
                {
                    classification: "faune non-oiseau",
                    etresVivantsAtteints: [],
                    activité: undefined, // Activité menaçante
                    méthode: undefined, // Méthode menaçante
                    transport: undefined // Transport impliqué dans la menace
                },
                {
                    classification: "flore",
                    etresVivantsAtteints: [],
                    activité: undefined, // Activité menaçante
                }
            ]
        }
    }


    const saisieEspèces = new SaisieEspèces({
        target: svelteTarget,
        props: mapStateToProps()
    });

    replaceComponent(saisieEspèces, mapStateToProps)
})



page('/import-historique/nouvelle-aquitaine', async () => {
    /** @type { [GeoAPICommune[] | undefined, GeoAPIDépartement[] | undefined, any, any] } */
    const [communes, départements, typeObjet, schema] = await Promise.all([
        json('https://geo.api.gouv.fr/communes'),
        json('https://geo.api.gouv.fr/departements'),
        csv('/data/import-historique/Correspondance Nom projet Objet projet.csv'),
        json('/data/schema-DS-88444.json')
    ])

    if(!communes){
        throw new TypeError('Communes manquantes')
    }
    if(!départements){
        throw new TypeError('Départements manquants')
    }

    /** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
    const nomToCommune = new Map()

    for(const commune of communes){
        nomToCommune.set(normalizeNomCommune(commune.nom), commune)
    }

    /** @type { Map<GeoAPICommune['nom'], GeoAPIDépartement> } */
    const stringToDépartement = new Map()

    for(const département of départements){
        stringToDépartement.set(département.code, département)
        stringToDépartement.set(département.nom, département)
    }


    if(!typeObjet){
        throw new TypeError('Correspondance type/objet manquante')
    }

    /** @type { Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDémarcheSimplifiée88444['Objet du projet']> } */
    const typeVersObjet = new Map()

    const objetsPossibles = new Set(schema.revision.champDescriptors.find(champ => champ.id === 'Q2hhbXAtMzg5NzQwMA==').options)

    for(let {'Tableau de suivi': type, 'Objet du projet (ONAGRE)': objet} of typeObjet){
        type = type.trim()
        objet = objet.trim()

        if(type.length >= 1 && objet.length >= 1){
            if(!objetsPossibles.has(objet)){
                console.warn(`L'objet dans le fichier de correpondance ne fait pas partie des options du schema`, objet, objetsPossibles)
            }

            typeVersObjet.set(type, objet)
        }
    }

    
    /**
     * 
     * @param {import('./store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps({dossiers}){
        return {dossiers, nomToCommune, stringToDépartement, typeVersObjet}
    }   
    
    const importHistorique = new ImportHistoriqueNouvelleAquitaine({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(importHistorique, mapStateToProps)
    
})

init()
.then(() => page.start())