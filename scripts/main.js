import App from './App.svelte';
import { dsv } from 'd3-fetch';

const data = await dsv(";", "data/liste_especes.csv");
console.log(data)

const dataMap = new Map()
data.forEach(d => {
	dataMap.set(d["CD_NOM"], d)
})
console.log(dataMap)

const app = new App({
	target: document.querySelector('.svelte-main'),
	props: {
		espèces: [...dataMap.values()]
	}
});
