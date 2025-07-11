//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import Stats from '../components/screens/Stats.svelte';
import { chargerStats } from '../actions/stats.js';

/** @import {PitchouState} from '../store.js' */

/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/stats')
    
    try {
        // Charger les statistiques depuis le backend
        console.log('Chargement des stats...')
        const stats = await chargerStats()
        console.log({stats})
        
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<Stats>}
         */
        function mapStateToProps(state) {
            const { email } = mapStateToSqueletteProps(state);
            return {
                email,
                stats
            };
        }  
        
        const StatsComponent = new Stats({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(StatsComponent, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement des stats:', error)
        // En cas d'erreur, afficher des stats par défaut
        const statsParDefaut = {
            totalDossiers: 0,
            dossiersEnPhaseContrôle: 0,
            dossiersEnPhaseContrôleAvecDécision: 0,
            dossiersEnPhaseContrôleSansDécision: 0,
            décisionsAvecPrescriptions: 0,
            décisionsSansPrescriptions: 0,
            totalDécisions: 0,
            totalContrôles: 0,
            nbPetitionnairesDepuisSept2024: 0,
            nbDossiersDepuisSept2024: 0,
            nbDossiersAEDepuisSept2024: 0
        }
        
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<Stats>}
         */
        function mapStateToProps(state) {
            const { email } = mapStateToSqueletteProps(state);
            return {
                email,
                stats: statsParDefaut
            };
        }
        
        const StatsComponent = new Stats({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(StatsComponent, mapStateToProps)
    }
}