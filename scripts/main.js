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
		espèces: [...dataMap.values()],
		descriptionMenacesEspèces: [
			{
				classification: "oiseau", // Type d'espèce menacée
				etresVivantsAtteints: [
					{
						espece: "Moineau domestique",
						nombreIndividus: 1000,
						surfaceHabitatDétruit: 1000 // Surface de l'habitat détruit
					},
					{
						espece: "Hirondelle rustique",
						nombreIndividus: 500,
						surfaceHabitatDétruit: 1000 // Surface de l'habitat détruit
					}
				],
				activité: 3, // Activité menaçante
				méthode: 11, // Méthode menaçante
				transport: true // Transport impliqué dans la menace
			},
			{
				classification: "faune non-oiseau",
				etresVivantsAtteints: [{
					espece: "Lynx",
					nombreIndividus: 15,
					surfaceHabitatDétruit: 20
				}],
				activité: 2,
				méthode: 11,
				transport: false
			},
			{
				classification: "flore",
				etresVivantsAtteints: [{
					espece: "Chêne",
					nombreIndividus: 1000,
					surfaceHabitatDétruit: 50
				}],
				activité: 3,
				méthode: 2,
				transport: true
			}
		]
	}
});
