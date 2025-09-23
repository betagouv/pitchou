//@ts-check

import {writeFile, readFile} from 'node:fs/promises'

import parseArgs from 'minimist'
import { compile } from 'json-schema-to-typescript'
import ky from 'ky'

/** @import {SchemaDémarcheSimplifiée, ChampDescriptor, ChampDescriptorTypename} from '../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {JSONSchema} from 'json-schema-to-typescript' */

const args = parseArgs(process.argv)

const ID_SCHEMA_DS = args.idSchemaDS

if (!ID_SCHEMA_DS) {
    throw Error("L'ID du Schéma DS n'est pas défini.")
}

const urlSchema = `https://www.demarches-simplifiees.fr/preremplir/${ID_SCHEMA_DS}/schema`

/** @type {SchemaDémarcheSimplifiée} */
let schema;

const schemaPath = `data/démarches-simplifiées/schema-DS/${ID_SCHEMA_DS}.json`

if(args.skipDownload){
    /** @type {string} */
    let schemaStr;
    try{
        schemaStr = await readFile(schemaPath, 'utf-8')
    }
    catch(e){
        console.error(`Erreur lors de la récupération du fichier ${schemaPath}`)
        console.error(e)
        process.exit(1)
    }

    schema = JSON.parse(schemaStr);

    console.log(`Utilisation du fichier ${schemaPath} déjà présent dans le repo`)
}
else{
    let schemaStr;

    console.info(`Téléchargement de la dernière version du schema DS ${urlSchema}`)
    try{
        schemaStr = await ky.get(urlSchema).text()
        schema = JSON.parse(schemaStr);
    }
    catch(err){
        console.error(`Erreur lors du téléchargement de ${urlSchema}. Réessayer plus tard ou avec l'option --skipDownload`)
        console.error(err)
        process.exit(1)
    }

    try{
        await writeFile(schemaPath, JSON.stringify(schema, null, 4))
    }
    catch(e){
        // ignore
    }
}

/**
 * @param {Pick<ChampDescriptor, 'description'>} _ 
 * @returns {JSONSchema}
 */
function champToStringJSONSchema({ description }){
    return { type: 'string', description }
}

/**
 * @param {Pick<ChampDescriptor, 'description' | 'options'>} _ 
 * @returns {JSONSchema}
 */
function champToStringEnumJSONSchema({ description, options }){
    return { type: 'string', description, enum: options }
}

/**
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToStringArrayJSONSchema({ description, options }){
    // enum: options
    return { 
        type: 'array', 
        description, 
        items: options ? 
            champToStringEnumJSONSchema({description: '', options}) :
            champToStringJSONSchema({description: ''})
    }
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
 * @param {ChampDescriptor} _ 
 * @returns {JSONSchema}
 */
function champToFileJSONSchema({ description }){
    return { type: 'object', tsType: 'ChampDSPieceJustificative', description }
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
        return __typename !== 'HeaderSectionChampDescriptor' &&
            __typename !== 'ExplicationChampDescriptor' && 
            __typename !== 'CarteChampDescriptor'
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
    [ "MultipleDropDownListChampDescriptor", champToStringArrayJSONSchema ],
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
    [ "RepetitionChampDescriptor", champToArrayJSONSchema ],
    [ "DateChampDescriptor", champToDateJSONSchema ],
    [ "PieceJustificativeChampDescriptor", champToFileJSONSchema ]
])


const { revision: { champDescriptors, annotationDescriptors } } = schema

/**
 * champDescriptors vers JSONSchema
 * @param {ChampDescriptor[]} champDescriptors 
 */
function champDescriptorsToJSONSchemaObjectType(champDescriptors){
    const properties = Object.create(null)
    const required = []

    for (const champDescriptor of champDescriptors) {
        const { __typename, label } = champDescriptor
    
        if(__typename !== 'HeaderSectionChampDescriptor' &&
            __typename !== 'ExplicationChampDescriptor' && 
            __typename !== 'CarteChampDescriptor') {
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




const dossierDémarcheSimplifiéeJSONSchema = champDescriptorsToJSONSchemaObjectType(champDescriptors)



const dossierDémarcheSimplifiéeInterfaceP = compile(
    //@ts-ignore
    dossierDémarcheSimplifiéeJSONSchema, 
    `DossierDemarcheSimplifiee${schema.number}`, 
    { bannerComment: '' }
)



/**
 * annotationDescriptors vers JSONSchema
 */

const annotationsDémarcheSimplifiéeJSONSchema = champDescriptorsToJSONSchemaObjectType(annotationDescriptors)


const annotationsDémarcheSimplifiéeInterfaceP = compile(
    //@ts-ignore
    annotationsDémarcheSimplifiéeJSONSchema, 
    `AnnotationsPriveesDemarcheSimplifiee${schema.number}`, 
    { bannerComment: '' }
)


const commentaireInitial = `/**
* Ce fichier a été généré automatiquement par outils/genere-types-schema-DS.js
* en prenant ${schemaPath} comme source
* 
* Ne pas le modifier à la main
* 
* À la place, mettre à jour ${schemaPath}
* d'après ${urlSchema}
* et relancer outils/genere-types-schema-DS.js
*/`

const imports = [
    `import { GeoAPICommune, GeoAPIDépartement } from "../GeoAPI.ts";`,
    `import { ChampDSPieceJustificative } from "./apiSchema.ts";`,
].join('\n')

const outPath = `scripts/types/démarches-simplifiées/DémarcheSimplifiée${schema.number}.ts`
await Promise.all([
    dossierDémarcheSimplifiéeInterfaceP,
    annotationsDémarcheSimplifiéeInterfaceP
])
.then(([
    dossierDémarcheSimplifiéeInterface,
    annotationsDémarcheSimplifiéeInterface
]) => [
    commentaireInitial, 
    imports,
    dossierDémarcheSimplifiéeInterface,
    annotationsDémarcheSimplifiéeInterface
].join('\n\n'))
.then(str => writeFile(outPath, str))

console.log(`Fichier ${outPath} généré avec succès`)
