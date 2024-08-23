//@ts-check


import { csv, json } from 'd3-fetch';

import { replaceComponent } from '../../routeComponentLifeCycle.js'
import store from '../../store.js'
import { svelteTarget } from '../../config.js'
import { mapStateToSqueletteProps } from '../../mapStateToComponentProps.js';

import ImportHistoriqueNouvelleAquitaine from '../../components/screens/ImportHistoriqueNouvelleAquitaine.svelte';

import { normalizeNomCommune } from '../../../commun/typeFormat.js';

/** @import { GeoAPICommune, GeoAPIDépartement } from "../../../types.js" */
/** @import {DossierTableauSuiviNouvelleAquitaine2023} from '../../../import-dossiers-historiques/nouvelle-aquitaine/types.js' */
/** @import {DossierDemarcheSimplifiee88444} from '../../../types/démarches-simplifiées/DémarcheSimplifiée88444.js' */


export default async () => {
    /** @type {GeoAPICommune[] | undefined} */
    const communes = (await json('https://geo.api.gouv.fr/communes'))

    /** @type {GeoAPIDépartement[] | undefined} */
    const départements = (await json('https://geo.api.gouv.fr/departements'))

     /** @type { [any, any] } */
    const [typeObjet, schema] = await Promise.all([
        csv('/data/import-historique/Nouvelle-Aquitaine/Correspondance Nom projet Objet projet.csv'),
        json('/data/démarches-simplifiées/schema-DS-88444.json')
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

    /** @type { Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDemarcheSimplifiee88444['Activité principale']> } */
    const typeVersObjet = new Map()

    const objetsPossibles = new Set(schema.revision.champDescriptors.find(
        /** 
         * @param {Object} champ 
         * @param {string} champ.id
         */ 
        champ => champ.id === 'Q2hhbXAtMzg5NzQwMA==').options
    )

    for(let {'Tableau de suivi': type, 'Objet du projet (à utiliser dans DS)': objet} of typeObjet){
        type = type.trim()
        objet = objet.trim()

        if(type.length >= 1 && objet.length >= 1){
            if(!objetsPossibles.has(objet) && objet !== 'à supprimer'){
                console.warn(`L'objet dans le fichier de correpondance ne fait pas partie des options du schema`, objet, objetsPossibles)
            }

            typeVersObjet.set(type, objet)
        }
    }

    const remplirAnnotationsURL = store.state.secret ? `/remplir-annotations?cap=${store.state.secret}` : undefined

    
    /**
     * 
     * @param {import('../../store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps({dossiers}){
        return {
            ...mapStateToSqueletteProps(store.state),
            dossiers, nomToCommune, stringToDépartement, typeVersObjet,
            remplirAnnotationsURL
        }
    }   
    
    const importHistorique = new ImportHistoriqueNouvelleAquitaine({
        target: svelteTarget,
        //@ts-ignore
        props: mapStateToProps(store.state)
    });

    replaceComponent(importHistorique, mapStateToProps)
    
}