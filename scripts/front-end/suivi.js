//@ts-check

import {json} from 'd3-fetch'

import SuiviInstructeur from './components/SuiviInstructeur.svelte';

import '../types.js'
const secret =  new URLSearchParams(location.search).get("secret")

json(`/dossiers?secret=${secret}`).then(dossiers => {
	const newURL = new URL(location.href)
	newURL.searchParams.delete("secret")

	history.replaceState(null, "", newURL)
	
	console.log('dossiers', dossiers)
	const app = new SuiviInstructeur({
		target: document.querySelector('.svelte-main'),
		props: {
			dossiers
		}
	});
})



