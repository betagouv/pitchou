import { dossierFragments } from "./graphQLfragments_dossier.ts";
import { champFragments } from "./graphQLfragments_champs.ts";
import { entityFragments } from "./graphQLfragments_entities.ts";

export const dossiersQuery = `
query getDemarche(
  $demarcheNumber: Int!
  $state: DossierState
  $first: Int
  $last: Int
  $before: String
  $after: String
  $archived: Boolean
  $revision: ID
  $createdSince: ISO8601DateTime
  $updatedSince: ISO8601DateTime
  $includeDossiers: Boolean = true
  $includeChamps: Boolean = true
  $includeAnotations: Boolean = true
  $includeTraitements: Boolean = true
  $includeInstructeurs: Boolean = true
  $includeAvis: Boolean = true
  $includeMessages: Boolean = true
  $includeCorrections: Boolean = false
) {
  demarche(number: $demarcheNumber) {
    id
    number
    title
    state
    dateCreation
    dossiers(
      state: $state
      first: $first
      last: $last
      before: $before
      after: $after
      archived: $archived
      createdSince: $createdSince
      updatedSince: $updatedSince
      revision: $revision
    ) @include(if: $includeDossiers) {
      pageInfo { ...PageInfoFragment }
      nodes { ...DossierFragment }
    }
  }
}
${dossierFragments}
${champFragments}
${entityFragments}`;
