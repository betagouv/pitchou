//@ts-check

import queryGraphQL from './queryGraphQL.js'
import schema88444 from '../../../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}
import {annotationTextMutationQuery, annotationCheckboxMutationQuery, annotationDateMutationQuery} from './graphQLqueries.js'


/** @import {AnnotationsPrivéesDémarcheSimplifiée88444} from '../../types.js' */
/** @import {ChampDescriptor, ChampDescriptorTypename} from '../../types/démarches-simplifiées/schema.js' */

/** @type {Map<keyof AnnotationsPrivéesDémarcheSimplifiée88444, ChampDescriptor>} */
//@ts-expect-error TS ne comprends pas que annotationDescriptor.label du schema donne forcément keyof AnnotationsPrivéesDémarcheSimplifiée88444
const labelToAnnotationDescriptor = new Map(
    schema88444.revision.annotationDescriptors.map(annotationDescriptor => ([annotationDescriptor.label, annotationDescriptor]))
)


/**
 * 
 * @param {string} token 
 * @param {{ dossierId: string, instructeurId:string, annotationId:string, value: string }} _ 
 * @returns {Promise<void>}
 */
function remplirAnnotationText(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationTextMutationQuery, {
        dossierId, instructeurId, annotationId, value: value || '', clientMutationId: Math.random().toString(36).slice(2)
    })
}


/**
 * 
 * @param {string} token 
 * @param {{ dossierId:string, instructeurId:string, annotationId:string, value: boolean }} _ 
 * @returns {Promise<unknown>}
 */
function remplirAnnotationCheckbox(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationCheckboxMutationQuery, {
        dossierId, instructeurId, annotationId, value: value || false
    })
}


/**
 * 
 * @param {string} token 
 * @param {{ dossierId:string, instructeurId:string, annotationId:string, value: Date }} _ 
 * @returns {Promise<unknown>}
 */
function remplirAnnotationDate(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationDateMutationQuery, {
        dossierId, instructeurId, annotationId, value: value ? value.toISOString().split('T')[0] : '1987-03-08'
    })
}

/** @typedef {(token: string, config: {dossierId: string, instructeurId: string, annotationId: string, value: any}) => Promise<any>} FonctionRemplissageAnnotation */

/** @type {Map<ChampDescriptorTypename, FonctionRemplissageAnnotation>} */
//@ts-ignore
const annotationTypeToFonctionRemplissage = new Map([
    [
        "TextChampDescriptor",
        remplirAnnotationText
    ],
    // N'existe pas encore https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10638
    /*[
        
        "DropDownListChampDescriptor",
        remplirAnnotationText 
    ],*/
    [
        "YesNoChampDescriptor",
        remplirAnnotationCheckbox
    ],
    [
        "TextareaChampDescriptor",
        remplirAnnotationText
    ],
    [
        "DateChampDescriptor",
        remplirAnnotationDate
    ]
])

/**
 * @param {string} token
 * @param {{dossierId: string, instructeurId: string, annotations: Partial<AnnotationsPrivéesDémarcheSimplifiée88444>}} _
 */
export default function remplirAnnotations(token, { dossierId, instructeurId, annotations }) {
    return Promise.all(Object.entries(annotations).map(([key, value]) => {
        //@ts-expect-error TS ne comprend pas que key est forcément un 'keyof AnnotationsPrivéesDémarcheSimplifiée88444'
        const annotationDescriptor = labelToAnnotationDescriptor.get(key)

        //console.log('annotationDescriptor', annotationDescriptor, value)

        if (!annotationDescriptor) {
            console.error(`annotationDescriptor manquant pour le label "${key}"`)
            throw new TypeError(`annotationDescriptor manquant pour le label "${key}"`)
        }

        const annotationType = annotationDescriptor.__typename

        const fonctionRemplissage = annotationTypeToFonctionRemplissage.get(annotationType)

        if (!fonctionRemplissage) {
            console.warn(`Pas de fonction de remplissage trouvée pour l'annotation "${key}" de type "${annotationType}"`)
            return Promise.resolve()
        }

        return fonctionRemplissage(token, { dossierId, instructeurId, annotationId: annotationDescriptor.id, value })
    }))
    .then(allResults => allResults.map(r => {
            if (!r)
                return undefined;

            const mutationResult = r.dossierModifierAnnotationText || r.dossierModifierAnnotationCheckbox || r.dossierModifierAnnotationDate
            return Array.isArray(mutationResult.errors) ? mutationResult.errors.map((/** @type {{ message: any; }} */ e) => e.message) : undefined
        })
        .filter(x => !!x)
        .flat()
    )
    .then(errors => {
        if(Array.isArray(errors) && errors.length >= 1){
            throw new Error(`Erreurs GraphQL pendant le remplissage des annotations: ${JSON.stringify(errors, null, 2)}`)
        }
        else{
            return undefined
        }
    })


}