//@ts-check

import {json} from 'd3-fetch'

import SuiviInstructeur from './components/SuiviInstructeur.svelte';

import '../types.js'

json('/dossiers').then(dossiers => {
	console.log('dossiers', dossiers)
	const app = new SuiviInstructeur({
		target: document.querySelector('.svelte-main'),
		props: {
			dossiers
		}
	});
})



