//@ts-check

/** @import {AnnotationsPrivéesDémarcheSimplifiée88444} from '../../types.js' */
/** @import {ChampDescriptor, ChampDescriptorTypename} from '../../types/démarches-simplifiées/types.ts' */

import queryGraphQL from './queryGraphQL.js'
import schema88444 from '../../../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}


/** @type {Map<keyof AnnotationsPrivéesDémarcheSimplifiée88444, ChampDescriptor>} */
const labelToAnnotationDescriptor = new Map(
    schema88444.revision.annotationDescriptors.map(annotationDescriptor => ([annotationDescriptor.label, annotationDescriptor]))
)


const annotationTextMutationQuery = `mutation ModifierAnnotationText(
    $dossierId: ID!,
    $instructeurId: ID!,
    $annotationId: ID!,
    $clientMutationId: String,
    $value: String!
  ) {
    dossierModifierAnnotationText(
      input: {
        dossierId: $dossierId,
        instructeurId: $instructeurId,
        annotationId: $annotationId,
        clientMutationId: $clientMutationId,
        value: $value
      }
    ) {
      clientMutationId
      errors { message }
    }
  }
`

/**
 * 
 * @param {string} token 
 * @param {{ dossierId:string, instructeurId:string, annotationId:string, value: string }} _ 
 * @returns {Promise<void>}
 */
function remplirAnnotationText(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationTextMutationQuery, {
        dossierId, instructeurId, annotationId, value: value || '', clientMutationId: Math.random().toString(36).slice(2)
    })
}




const annotationCheckboxMutationQuery = `mutation ModifierAnnotationCheckbox(
    $dossierId: ID!,
    $instructeurId: ID!,
    $annotationId: ID!,
    $clientMutationId: String,
    $value: Boolean!
  ) {
    dossierModifierAnnotationCheckbox(
      input: {
        dossierId: $dossierId,
        instructeurId: $instructeurId,
        annotationId: $annotationId,
        clientMutationId: $clientMutationId,
        value: $value
      }
    ) {
        clientMutationId
        errors { message }
    }
  }
`

/**
 * 
 * @param {string} token 
 * @param {{ dossierId:string, instructeurId:string, annotationId:string, value: boolean }} _ 
 * @returns {Promise<void>}
 */
function remplirAnnotationCheckbox(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationCheckboxMutationQuery, {
        dossierId, instructeurId, annotationId, value: value || false
    })
}




const annotationDateMutationQuery = `mutation ModifierAnnotationDate(
    $dossierId: ID!,
    $instructeurId: ID!,
    $annotationId: ID!,
    $clientMutationId: String,
    $value: ISO8601Date!
  ) {
    dossierModifierAnnotationDate(
      input: {
        dossierId: $dossierId,
        instructeurId: $instructeurId,
        annotationId: $annotationId,
        clientMutationId: $clientMutationId,
        value: $value
      }
    ) {
        clientMutationId
        errors { message }
    }
  }
`

/**
 * 
 * @param {string} token 
 * @param {{ dossierId:string, instructeurId:string, annotationId:string, value: Date }} _ 
 * @returns {Promise<void>}
 */
function remplirAnnotationDate(token, { dossierId, instructeurId, annotationId, value }) {
    return queryGraphQL(token, annotationDateMutationQuery, {
        dossierId, instructeurId, annotationId, value: value ? value.toISOString().split('T')[0] : '1987-03-08'
    })
}


/** @type {Map<ChampDescriptorTypename, (...args: any[]) => any>} */
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
        const annotationDescriptor = labelToAnnotationDescriptor.get(key)

        console.log('annotationDescriptor', annotationDescriptor, value)

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
            return mutationResult.errors
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