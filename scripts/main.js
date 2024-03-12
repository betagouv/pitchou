//@ts-check

import { dsv } from 'd3-fetch';

import App from './App.svelte';

import './types.js'

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

/** @type { {REGNE: Règne, CLASSE: Classe, CD_NOM: string }[]  } */
const listeEspècesProtégées = [...dataMap.values()]

const filtreParClassification = new Map([
	["oiseau", ((/** @type {{REGNE: Règne, CLASSE: Classe}} */ {REGNE, CLASSE}) => {
		return REGNE === 'Animalia' && CLASSE === 'Aves'
	})],
	["faune non-oiseau", ((/** @type {{REGNE: Règne, CLASSE: Classe}} */ {REGNE, CLASSE}) => {
		return REGNE === 'Animalia' && CLASSE !== 'Aves'
	})],
	["flore", ((/** @type {{REGNE: Règne, CLASSE: Classe}} */ {REGNE}) => {
		return REGNE === 'Plantae'
	})]
])

const espècesProtégéesParClassification = new Map(
	[...filtreParClassification].map(([classif, filtre]) => ([classif, listeEspècesProtégées.filter(filtre)]))
)

console.log('espècesProtégéesParClassification', espècesProtégéesParClassification)

const app = new App({
	target: document.querySelector('.svelte-main'),
	props: {
		espècesProtégéesParClassification,
		/** @type {DescriptionMenaceEspèce[]} */
		descriptionMenacesEspèces: [
			{
				classification: "oiseau", // Type d'espèce menacée
				etresVivantsAtteints: [
					{
						espece: espècesProtégéesParClassification.get('oiseau')[0],
						nombreIndividus: 1000,
						nombreNids: 5,
						nombreOeufs: 10,
						surfaceHabitatDétruit: 1000 // Surface de l'habitat détruit
					},
					{
						espece: espècesProtégéesParClassification.get('oiseau')[5],
						nombreIndividus: 500,
						nombreNids: 7,
						nombreOeufs: 61,
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
					espece: espècesProtégéesParClassification.get('faune non-oiseau')[15],
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
					espece: espècesProtégéesParClassification.get('flore')[150],
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
