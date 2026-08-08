export const dossierFragments = `
fragment DossierFragment on Dossier {
  __typename
  id
  number
  archived
  prefilled
  state
  dateDerniereModification
  dateDepot
  datePassageEnConstruction
  datePassageEnInstruction
  dateTraitement
  dateExpiration
  dateSuppressionParUsager
  dateDerniereCorrectionEnAttente @include(if: $includeCorrections)
  motivation
  motivationAttachment { ...FileFragment }
  attestation { ...FileFragment }
  pdf { ...FileFragment }
  usager { email }
  prenomMandataire
  nomMandataire
  deposeParUnTiers
  groupeInstructeur { ...GroupeInstructeurFragment }
  demandeur {
    __typename
    ...PersonnePhysiqueFragment
    ...PersonneMoraleFragment
    ...PersonneMoraleIncompleteFragment
  }
  demarche { revision { id } }
  instructeurs @include(if: $includeInstructeurs) { id email }
  traitements @include(if: $includeTraitements) {
    state
    emailAgentTraitant
    dateTraitement
    motivation
  }
  champs @include(if: $includeChamps) { ...ChampFragment ...RootChampFragment }
  annotations @include(if: $includeAnotations) { ...ChampFragment ...RootChampFragment }
  avis @include(if: $includeAvis) { ...AvisFragment }
  messages @include(if: $includeMessages) { ...MessageFragment }
}
fragment GroupeInstructeurFragment on GroupeInstructeur { id label }
fragment AvisFragment on Avis {
  id
  question
  reponse
  dateQuestion
  dateReponse
  claimant { email }
  expert { email }
  attachments { ...FileFragment }
}
fragment MessageFragment on Message {
  id
  email
  body
  createdAt
  attachments { ...FileFragment }
  correction @include(if: $includeCorrections) { reason dateResolution }
}
fragment RootChampFragment on Champ {
  ... on RepetitionChamp { rows { champs { ...ChampFragment } } }
  ... on DossierLinkChamp { dossier { id number state } }
}`;
