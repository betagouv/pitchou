//@ts-check

import {writeFile, readFile} from 'node:fs/promises'

import parseArgs from 'minimist'
import { compile } from 'json-schema-to-typescript'
import ky from 'ky'

/** @import {SchemaDémarcheSimplifiée, ChampDescriptorTypename} from '../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {JSONSchema} from 'json-schema-to-typescript' */

const args = parseArgs(process.argv)

/** @type {SchemaDémarcheSimplifiée} */
let schema88444;

const schemaPath = 'data/démarches-simplifiées/schema-DS-88444.json'
const outPath = 'scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts'

if(args.skipDownload){
    /** @type {string} */
    let schemaStr;
    try{
        schemaStr = await readFile(schemaPath, 'utf-8')
    }
    catch(e){
        console.error('Erreur lors de la récupération du fichier data/démarches-simplifiées/schema-DS-88444.json')
        console.error(e)
        process.exit(1)
    }

    schema88444 = JSON.parse(schemaStr);

    console.log(`Utilisation du fichier data/démarches-simplifiées/schema-DS-88444.json déjà présent dans le repo`)
}
else{
    const urlSchema88444 = 'https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema'
    let schemaStr;

    console.log(`Téléchargement de la dernière version du schema DS 88444`)
    try{
        schemaStr = await ky.get(urlSchema88444).text()
        schema88444 = JSON.parse(schemaStr);
    }
    catch(err){
        console.error(`Erreur lors du téléchargement de ${urlSchema88444}. Réessayer plus tard ou avec l'option --skipDownload`)
        console.error(err)
        process.exit(1)
    }

    try{
        await writeFile(schemaPath, JSON.stringify(schema88444, null, 4))
    }
    catch(e){
        // ignore
    }
}




/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToStringJSONSchema({ description }){
    return { type: 'string', description }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToStringEnumJSONSchema({ description, options }){
    return { type: 'string', description, enum: options }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToDateJSONSchema({ description }){
    return { type: 'string', format: 'date-time', tsType: 'Date', description }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToBooleanJSONSchema({description}){
    return { type: 'boolean', description }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToNumberJSONSchema({ description }){
    return { type: 'number', description }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToDépartementJSONSchema({ description }){
    return { type: 'object', tsType: 'GeoAPIDépartement', description }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToCommuneJSONSchema({ description }){
    return { type: 'object', tsType: '(GeoAPICommune | string)', description }
}

/**
 * @param {ChampDescriptor} champ
 * @returns {JSONSchema | undefined}
 */
function champToArrayJSONSchema({description, champDescriptors}){
    if(!champDescriptors){
        throw new TypeError('missing champDescriptors')
    }

    champDescriptors = champDescriptors.filter(({__typename}) => {
        return __typename !== 'HeaderSectionChampDescriptor' && __typename !== 'PieceJustificativeChampDescriptor' && __typename !== 'ExplicationChampDescriptor'
    })

    /** @type {JSONSchema} */
    let items

    if(champDescriptors.length === 0){
        return undefined
    }

    if(champDescriptors.length === 1){
        const { __typename } = champDescriptors[0]
        const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename)
        if(!DSChampToJSONSchema){ throw new TypeError(`__typename non reconnu : ${__typename}`) }
        // @ts-ignore
        items = DSChampToJSONSchema(champDescriptors[0])
    }
    else{
        // @ts-ignore
        items = champDescriptorsToJSONSchemaObjectType(champDescriptors)
    }

    return { 
        type: 'array', 
        description: description,
        items
    }
}

/** @type {Map<ChampDescriptorTypename, (cd: ChampDescriptor) => (JSONSchema | undefined)>} */
const DSTypenameToJSONSchema = new Map([
    [ "DropDownListChampDescriptor", champToStringEnumJSONSchema ],
    [ "MultipleDropDownListChampDescriptor", champToStringEnumJSONSchema ],
    [ "YesNoChampDescriptor", champToBooleanJSONSchema ],
    [ "CheckboxChampDescriptor", champToBooleanJSONSchema ],
    [ "SiretChampDescriptor", champToStringJSONSchema ],
    [ "TextChampDescriptor", champToStringJSONSchema ],
    [ "AddressChampDescriptor", champToStringJSONSchema ],
    [ "PhoneChampDescriptor", champToStringJSONSchema ],
    [ "EmailChampDescriptor", champToStringJSONSchema ],
    [ "TextareaChampDescriptor", champToStringJSONSchema ],
    [ "IntegerNumberChampDescriptor", champToNumberJSONSchema ],
    [ "DecimalNumberChampDescriptor", champToNumberJSONSchema ],
    [ "DepartementChampDescriptor", champToDépartementJSONSchema ],
    [ "CommuneChampDescriptor", champToCommuneJSONSchema ],
    // PPP : invalide, mais ne sait pas encore comment bien le gérer
    [ "RepetitionChampDescriptor", champToArrayJSONSchema ],
    [ "DateChampDescriptor", champToDateJSONSchema ]
])


const { revision: { champDescriptors, annotationDescriptors } } = schema88444

/**
 * champDescriptors vers JSONSchema
 * @param {ChampDescriptor[]} champDescriptors 
 */
function champDescriptorsToJSONSchemaObjectType(champDescriptors){
    const properties = Object.create(null)
    const required = []

    for (const champDescriptor of champDescriptors) {
        const { __typename, label } = champDescriptor
    
        if(__typename !== 'HeaderSectionChampDescriptor' && __typename !== 'PieceJustificativeChampDescriptor' && __typename !== 'ExplicationChampDescriptor') {
            const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename)
    
            if(!DSChampToJSONSchema){
                throw new TypeError(`__typename non reconnu : ${__typename}`)
            }
    
            const type = DSChampToJSONSchema(champDescriptor);

            if(type){
                properties[label] = DSChampToJSONSchema(champDescriptor);
        
                // ignore champDescriptor.required
                required.push(label)
            }
        }
    }

    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties,
        required,
        additionalProperties: false
    }
}




const dossierDémarcheSimplifiée88444JSONSchema = champDescriptorsToJSONSchemaObjectType(champDescriptors)

const dossierDémarcheSimplifiée88444InterfaceP = compile(
    //@ts-ignore
    dossierDémarcheSimplifiée88444JSONSchema, 
    'DossierDemarcheSimplifiee88444', 
    { bannerComment: '' }
)



/**
 * annotationDescriptors vers JSONSchema
 */

const annotationsDémarcheSimplifiée88444JSONSchema = champDescriptorsToJSONSchemaObjectType(annotationDescriptors)


const annotationsDémarcheSimplifiée88444InterfaceP = compile(
    //@ts-ignore
    annotationsDémarcheSimplifiée88444JSONSchema, 
    'AnnotationsPriveesDemarcheSimplifiee88444', 
    { bannerComment: '' }
)


const commentaireInitial = `/**
* Ce fichier a été généré automatiquement par outils/genere-types-88444.js
* en prenant data/démarches-simplifiées/schema-DS-88444.json comme source
* 
* Ne pas le modifier à la main
* 
* À la place, mettre à jour data/démarches-simplifiées/schema-DS-88444.json
* d'après https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema
* et faire relancer outils/genere-types-88444.js
*/`

const imports = `import { GeoAPICommune, GeoAPIDépartement } from "../GeoAPI.ts";`


await Promise.all([
    dossierDémarcheSimplifiée88444InterfaceP,
    annotationsDémarcheSimplifiée88444InterfaceP
])
.then(([
    dossierDémarcheSimplifiée88444Interface,
    annotationsDémarcheSimplifiée88444Interface
]) => [
    commentaireInitial, 
    imports,
    dossierDémarcheSimplifiée88444Interface,
    annotationsDémarcheSimplifiée88444Interface
].join('\n\n'))
.then(str => writeFile(outPath, str))

console.log(`Fichier ${outPath} généré avec succès`)