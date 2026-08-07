export const annotationCheckboxMutationQuery = `mutation ModifierAnnotationCheckbox(
  $dossierId: ID!, $instructeurId: ID!, $annotationId: ID!,
  $clientMutationId: String, $value: Boolean!
) {
  dossierModifierAnnotationCheckbox(input: {
    dossierId: $dossierId, instructeurId: $instructeurId,
    annotationId: $annotationId, clientMutationId: $clientMutationId, value: $value
  }) { clientMutationId errors { message } }
}`;

export const annotationTextMutationQuery = `mutation ModifierAnnotationText(
  $dossierId: ID!, $instructeurId: ID!, $annotationId: ID!,
  $clientMutationId: String, $value: String!
) {
  dossierModifierAnnotationText(input: {
    dossierId: $dossierId, instructeurId: $instructeurId,
    annotationId: $annotationId, clientMutationId: $clientMutationId, value: $value
  }) { clientMutationId errors { message } }
}`;

export const annotationDateMutationQuery = `mutation ModifierAnnotationDate(
  $dossierId: ID!, $instructeurId: ID!, $annotationId: ID!,
  $clientMutationId: String, $value: ISO8601Date!
) {
  dossierModifierAnnotationDate(input: {
    dossierId: $dossierId, instructeurId: $instructeurId,
    annotationId: $annotationId, clientMutationId: $clientMutationId, value: $value
  }) { clientMutationId errors { message } }
}`;

export const GroupeInstructeursQuery = `query ($demarcheNumber: Int!) {
  demarche(number: $demarcheNumber) {
    groupeInstructeurs { label instructeurs { id email } }
  }
}`;
