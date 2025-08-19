/**
 * le chargement d'odfjs charge ses et lance un appel à lockdown()
 * Cet appel peut être incompatible avec d'autres libs
 * https://www.npmjs.com/package/ses#ecosystem-compatibility
 * notamment à cause de la "override mistake"
 * Ce module est l'opportunité de faire le nécessaire avant l'appel à lockdown pour 
 * préserver la compatibilité
 */

// SvelteSet, SvelteMap se cognent sur l'override mistake lors de l'initialisation de la première instance
import {SvelteSet, SvelteMap} from 'svelte/reactivity'

// on créé une première instance pour éviter de prendre une erreur après lockdown
let s = new SvelteSet()
let m = new SvelteMap()

void s
void m