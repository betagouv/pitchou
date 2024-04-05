//@ts-check

import {json} from 'd3-fetch'

import SuiviInstructeur from './components/SuiviInstructeur.svelte';

import '../types.js'

json('/démarche').then(démarche => {
	console.log('démarche', démarche)
	const app = new SuiviInstructeur({
		target: document.querySelector('.svelte-main'),
		props: {
			démarche
		}
	});
	
})



