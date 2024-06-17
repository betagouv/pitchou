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
import {filtreParClassification} from '../commun/outils-espèces.js'

import '../types.js'


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
     * @param {string} x 
     * @returns {x is ClassificationEtreVivant}
     */
    function isClassif(x){
        // @ts-expect-error indeed
        return classificationEtreVivants.includes(x)
    }

    /**
     * 
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
    
    /** @type { [any[], ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[]] } */
    // @ts-ignore
    const [dataEspèces, activites, methodes, transports] = await Promise.all([
        dsv(";", getURL('link#especes-data')),
        dsv(";", getURL('link#activites-data')),
        dsv(";", getURL('link#methodes-data')),
        dsv(";", getURL('link#transports-data')),
    ])

    console.log(dataEspèces, activites, methodes, transports)

    /** @type {readonly ClassificationEtreVivant[]} */
    const classificationEtreVivants = Object.freeze(["oiseau", "faune non-oiseau", "flore"])



    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    const activitesParClassificationEtreVivant = new Map()
    for(const activite of activites){
        const classif = activite['Espèces']

        if(!classif.trim() && !activite['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
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
            throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
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
            throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
        }
        
        const classifTrans = transportsParClassificationEtreVivant.get(classif) || []
        classifTrans.push(transport)
        transportsParClassificationEtreVivant.set(classif, classifTrans)
    }



    const espèceByCD_NOM = new Map()
    dataEspèces.forEach(d => {
        espèceByCD_NOM.set(d["CD_NOM"], d)
    })
    console.log(espèceByCD_NOM)

    /** @type { Espèce[] } */
    const listeEspècesProtégées = [...espèceByCD_NOM.values()]


    const espècesProtégéesParClassification = new Map(
        [...filtreParClassification].map(([classif, filtre]) => ([classif, listeEspècesProtégées.filter(filtre)]))
    )

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
        return descriptionMenacesEspècesJSON.map(({classification, etresVivantsAtteints}) => {
            console.log('classification, etresVivantsAtteints', classification, etresVivantsAtteints)
            return {
                classification, 
                etresVivantsAtteints: etresVivantsAtteints.map(({espece, activité, méthode, transport, ...rest}) => ({
                    espece: espèceByCD_NOM.get(espece),
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

    function mapStateToProps(){
        return {
            espècesProtégéesParClassification,
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant,
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
    /** @type { [GeoAPICommune[] | undefined, any, any] } */
    const [communes, typeObjet, schema] = await Promise.all([
        json('https://geo.api.gouv.fr/communes'),
        csv('/data/import-historique/Correspondance Nom projet Objet projet.csv'),
        json('/data/schema-DS-88444.json')
    ])

    if(!communes){
        throw new TypeError('Communes manquantes')
    }

    /** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
    const nomToCommune = new Map()

    for(const commune of communes){
        nomToCommune.set(normalizeNomCommune(commune.nom), commune)
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
        return {dossiers, nomToCommune, typeVersObjet}
    }   
    
    const importHistorique = new ImportHistoriqueNouvelleAquitaine({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(importHistorique, mapStateToProps)
    
})

init()
.then(() => page.start())