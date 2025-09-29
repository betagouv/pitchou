//@ts-check

/** @import {ComponentProps} from 'svelte' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import Accessibilite from '../components/screens/Accessibilite.svelte';

export default async () => {
    let html = ''
    try {
        const res = await fetch('/declaration-accessibilite_2025-07-07.html', { credentials: 'same-origin' })
        html = await res.text()
    }
    catch (err) {
        console.error('Erreur chargement déclaration accessibilité', err)
        html = ''
    }

    /**
     * 
     * @returns {ComponentProps<typeof Accessibilite>}
     */
    function mapStateToProps() {
        return {
            title: 'Accessibilité',
            html
        };
    }

    replaceComponent(Accessibilite, mapStateToProps)
}


