import App from './App.svelte';
import { dsv } from 'd3-fetch';

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
  

const data = await dsv(";", getURL('link#especes-data'));

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
