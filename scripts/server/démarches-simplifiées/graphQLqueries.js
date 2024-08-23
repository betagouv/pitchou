
export const annotationCheckboxMutationQuery = `mutation ModifierAnnotationCheckbox(
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

export const annotationTextMutationQuery = `mutation ModifierAnnotationText(
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


export const annotationDateMutationQuery = `mutation ModifierAnnotationDate(
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

export const GroupeInstructeursQuery = `query ($demarcheNumber: Int!) {
    demarche(number: $demarcheNumber) {
        groupeInstructeurs {
            label
            instructeurs {
                id
                email
            }
        }
    }
}`


// ne pas récupérer l'id https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10669
export const deletedDossiersQuery = `query getDemarche(
    $demarcheNumber: Int!
    $deletedFirst: Int
    $deletedLast: Int
    $deletedBefore: String
    $deletedAfter: String
    $deletedSince: ISO8601DateTime
  ) {
    demarche(number: $demarcheNumber) {
      deletedDossiers(
        first: $deletedFirst
        last: $deletedLast
        before: $deletedBefore
        after: $deletedAfter
        deletedSince: $deletedSince
      ) {
        pageInfo {
          ...PageInfoFragment
        }
        nodes {
          ...DeletedDossierFragment
        }
      }
    }
  }
  
  fragment DeletedDossierFragment on DeletedDossier {
    number
    dateSupression
    state
    reason
  }
  
  fragment PageInfoFragment on PageInfo {
    hasPreviousPage
    hasNextPage
    startCursor
    endCursor
  }`;

// ne pas récupérer l'id https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10669
export const pendingDeletedDossiersQuery = `query getDemarche(
    $demarcheNumber: Int!
    $deletedFirst: Int
    $deletedLast: Int
    $deletedBefore: String
    $deletedAfter: String
    $deletedSince: ISO8601DateTime
  ) {
    demarche(number: $demarcheNumber) {
      pendingDeletedDossiers (
        first: $deletedFirst
        last: $deletedLast
        before: $deletedBefore
        after: $deletedAfter
        deletedSince: $deletedSince
      ) {
        pageInfo {
          ...PageInfoFragment
        }
        nodes {
          ...DeletedDossierFragment
        }
      }
    }
  }
  
  fragment DeletedDossierFragment on DeletedDossier {
    number
    dateSupression
    state
    reason
  }
  
  fragment PageInfoFragment on PageInfo {
    hasPreviousPage
    hasNextPage
    startCursor
    endCursor
  }`;
