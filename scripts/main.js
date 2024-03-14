//@ts-check

import { dsv } from 'd3-fetch';

import App from './App.svelte';

import './types.js'

/**
 * @param {string} x 
 * @returns {x is ClassificationEtreVivant}
 */
function isClassif(x){
	// @ts-expect-error indeed
	return classificationEtreVivants.includes(x)
}

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
  
/** @type { [any[], ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[]] } */
// @ts-ignore
const [dataEspèces, activites, methodes, transports] = await Promise.all([
	dsv(";", getURL('link#especes-data')),
	dsv(";", getURL('link#activites-data')),
	dsv(";", getURL('link#methodes-data')),
	dsv(";", getURL('link#transports-data')),
])

console.log(dataEspèces, activites, methodes, transports)

/** @type {readonly ClassificationEtreVivant[]} */
const classificationEtreVivants = Object.freeze(["oiseau", "faune non-oiseau", "flore"])



/** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
const activitesParClassificationEtreVivant = new Map()
for(const activite of activites){
	const classif = activite['Espèces']

	if(!isClassif(classif)){
		throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
	}
	
	const classifActivz = activitesParClassificationEtreVivant.get(classif) || []
	classifActivz.push(activite)
	activitesParClassificationEtreVivant.set(classif, classifActivz)
}

/** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
const méthodesParClassificationEtreVivant = new Map()
for(const methode of methodes){
	const classif = methode['Espèces']

	if(!isClassif(classif)){
		throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
	}
	
	const classifMeth = méthodesParClassificationEtreVivant.get(classif) || []
	classifMeth.push(methode)
	méthodesParClassificationEtreVivant.set(classif, classifMeth)
}

/** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
const transportsParClassificationEtreVivant = new Map()
for(const transport of transports){
	const classif = transport['Espèces']

	if(!isClassif(classif)){
		throw new TypeError(`Classification d'espèce non reconnue: ${classif}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
	}
	
	const classifTrans = transportsParClassificationEtreVivant.get(classif) || []
	classifTrans.push(transport)
	transportsParClassificationEtreVivant.set(classif, classifTrans)
}



const dataMap = new Map()
dataEspèces.forEach(d => {
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
		activitesParClassificationEtreVivant, 
		méthodesParClassificationEtreVivant, 
		transportsParClassificationEtreVivant,
		/** @type {DescriptionMenaceEspèce[]} */
		// @ts-ignore
		descriptionMenacesEspèces: [
			{
				classification: "oiseau", // Type d'espèce menacée
				etresVivantsAtteints: [],
				activité: undefined, // Activité menaçante
				méthode: undefined, // Méthode menaçante
				transport: undefined // Transport impliqué dans la menace
			},
			{
				classification: "faune non-oiseau",
				etresVivantsAtteints: [],
				activité: undefined, // Activité menaçante
				méthode: undefined, // Méthode menaçante
				transport: undefined // Transport impliqué dans la menace
			},
			{
				classification: "flore",
				etresVivantsAtteints: [],
				activité: undefined, // Activité menaçante
			}
		]
	}
});
