//@ts-check

import {writeFile} from 'node:fs/promises'

import { compile } from 'json-schema-to-typescript'

import _schema88444 from '../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}

/** @import {SchemaDémarcheSimplifiée, ChampDescriptor, ChampDescriptorTypename} from '../scripts/types/démarches-simplifiées/schema.ts' */

/** @type {SchemaDémarcheSimplifiée} */
// @ts-expect-error TS ne sait pas que _typename est contraint plus fort que string
const schema88444 = _schema88444

/** @import {JSONSchema} from 'json-schema-to-typescript' */

const { revision: { champDescriptors, annotationDescriptors } } = schema88444

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

/** @type {Map<ChampDescriptorTypename, (cd: ChampDescriptor) => JSONSchema>} */
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
    [ "DepartementChampDescriptor", champToStringJSONSchema ],
    // PPP : invalide, mais ne sait pas encore comment bien le gérer
    [ "RepetitionChampDescriptor", champToStringJSONSchema ],
    [ "CommuneChampDescriptor", champToStringJSONSchema ],
    [ "DateChampDescriptor", champToDateJSONSchema ]
])




/**
 * champDescriptors vers JSONSchema
 */

const dossier88444JsonSchemaProperties = Object.create(null)
const requiredDossier88444 = []

for (const champDescriptor of champDescriptors) {
    const { __typename, label } = champDescriptor

    const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename)

    if (DSChampToJSONSchema) {
        dossier88444JsonSchemaProperties[label] = DSChampToJSONSchema(champDescriptor);

        // ignore champDescriptor.required
        requiredDossier88444.push(label)
    }
}

const dossierDémarcheSimplifiée88444JSONSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: dossier88444JsonSchemaProperties,
    additionalProperties: false,
    required: requiredDossier88444
}

const dossierDémarcheSimplifiée88444InterfaceP = compile(
    //@ts-ignore
    dossierDémarcheSimplifiée88444JSONSchema, 
    'DossierDémarcheSimplifiée88444', 
    { bannerComment: '' }
)



/**
 * annotationDescriptors vers JSONSchema
 */

const annotations88444JsonSchemaProperties = Object.create(null)
const requiredAnnotations88444 = []

for (const annotationDescriptor of annotationDescriptors) {
    const { __typename, label } = annotationDescriptor

    const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename)

    if (DSChampToJSONSchema) {
        annotations88444JsonSchemaProperties[label] = DSChampToJSONSchema(annotationDescriptor);

        // ignore annotationDescriptor.required
        requiredAnnotations88444.push(label)
    }
}

const annotationsDémarcheSimplifiée88444JSONSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: annotations88444JsonSchemaProperties,
    additionalProperties: false,
    required: requiredAnnotations88444
}


const annotationsDémarcheSimplifiée88444InterfaceP = compile(
    //@ts-ignore
    annotationsDémarcheSimplifiée88444JSONSchema, 
    'AnnotationsDémarcheSimplifiée88444', 
    { bannerComment: '' }
)

const outPath = 'scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts'

await Promise.all([
    dossierDémarcheSimplifiée88444InterfaceP,
    annotationsDémarcheSimplifiée88444InterfaceP
])
.then(([
    dossierDémarcheSimplifiée88444Interface,
    annotationsDémarcheSimplifiée88444Interface
]) => [
    commentaireInitial, 
    dossierDémarcheSimplifiée88444Interface,
    annotationsDémarcheSimplifiée88444Interface
].join('\n\n'))
.then(str => writeFile(outPath, str))

console.log(`Fichier ${outPath} généré avec succès`)