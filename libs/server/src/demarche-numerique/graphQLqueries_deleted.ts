const deletedDossierFragments = `
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

const deletedDossierQuery = (field: "deletedDossiers" | "pendingDeletedDossiers") => `
query getDemarche(
  $demarcheNumber: Int!
  $deletedFirst: Int
  $deletedLast: Int
  $deletedBefore: String
  $deletedAfter: String
  $deletedSince: ISO8601DateTime
) {
  demarche(number: $demarcheNumber) {
    ${field}(
      first: $deletedFirst
      last: $deletedLast
      before: $deletedBefore
      after: $deletedAfter
      deletedSince: $deletedSince
    ) {
      pageInfo { ...PageInfoFragment }
      nodes { ...DeletedDossierFragment }
    }
  }
}
${deletedDossierFragments}`;

// Do not fetch the id: https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10669
export const deletedDossiersQuery = deletedDossierQuery("deletedDossiers");
export const pendingDeletedDossiersQuery = deletedDossierQuery("pendingDeletedDossiers");
