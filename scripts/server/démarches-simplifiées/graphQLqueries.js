
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
      pageInfo {
        ...PageInfoFragment
      }
      nodes {
        ...DossierFragment
      }
    }
  }
}

fragment GroupeInstructeurFragment on GroupeInstructeur {
  id
  number
  label
  instructeurs @include(if: $includeInstructeurs) {
    id
    email
  }
}

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
  motivationAttachment {
    ...FileFragment
  }
  attestation {
    ...FileFragment
  }
  pdf {
    ...FileFragment
  }
  usager {
    email
  }
  prenomMandataire
  nomMandataire
  deposeParUnTiers
  groupeInstructeur {
    ...GroupeInstructeurFragment
  }
  demandeur {
    __typename
    ...PersonnePhysiqueFragment
    ...PersonneMoraleFragment
    ...PersonneMoraleIncompleteFragment
  }
  demarche {
    revision {
      id
    }
  }
  instructeurs @include(if: $includeInstructeurs) {
    id
    email
  }
  traitements @include(if: $includeTraitements) {
    state
    emailAgentTraitant
    dateTraitement
    motivation
  }
  champs @include(if: $includeChamps) {
    ...ChampFragment
    ...RootChampFragment
  }
  annotations @include(if: $includeAnotations) {
    ...ChampFragment
    ...RootChampFragment
  }
  avis @include(if: $includeAvis) {
    ...AvisFragment
  }
  messages @include(if: $includeMessages) {
    ...MessageFragment
  }
}

fragment AvisFragment on Avis {
  id
  question
  reponse
  dateQuestion
  dateReponse
  claimant {
    email
  }
  expert {
    email
  }
  attachments {
    ...FileFragment
  }
}

fragment MessageFragment on Message {
  id
  email
  body
  createdAt
  attachments {
    ...FileFragment
  }
  correction @include(if: $includeCorrections) {
    reason
    dateResolution
  }
}

fragment RootChampFragment on Champ {
  ... on RepetitionChamp {
    rows {
      champs {
        ...ChampFragment
      }
    }
  }
  ... on DossierLinkChamp {
    dossier {
      id
      number
      state
    }
  }
}

fragment ChampFragment on Champ {
  id
  label
  stringValue
  updatedAt
  ... on DateChamp {
    date
  }
  ... on DatetimeChamp {
    datetime
  }
  ... on CheckboxChamp {
    checked: value
  }
  ... on DecimalNumberChamp {
    decimalNumber: value
  }
  ... on IntegerNumberChamp {
    integerNumber: value
  }
  ... on CiviliteChamp {
    civilite: value
  }
  ... on LinkedDropDownListChamp {
    primaryValue
    secondaryValue
  }
  ... on MultipleDropDownListChamp {
    values
  }
  ... on PieceJustificativeChamp {
    files {
      ...FileFragment
    }
  }
  ... on AddressChamp {
    address {
      ...AddressFragment
    }
    commune {
      ...CommuneFragment
    }
    departement {
      ...DepartementFragment
    }
  }
  ... on EpciChamp {
    epci {
      ...EpciFragment
    }
    departement {
      ...DepartementFragment
    }
  }
  ... on CommuneChamp {
    commune {
      ...CommuneFragment
    }
    departement {
      ...DepartementFragment
    }
  }
  ... on DepartementChamp {
    departement {
      ...DepartementFragment
    }
  }
  ... on RegionChamp {
    region {
      ...RegionFragment
    }
  }
  ... on SiretChamp {
    etablissement {
      ...PersonneMoraleFragment
    }
  }
  ... on RNFChamp {
    rnf {
      ...RNFFragment
    }
    commune {
      ...CommuneFragment
    }
    departement {
      ...DepartementFragment
    }
  }
}

fragment PersonneMoraleFragment on PersonneMorale {
  siret
  address {
    ...AddressFragment
  }
  entreprise {
    siren
    nomCommercial
    raisonSociale
    siretSiegeSocial
  }
  association {
    rna
    titre
    objet
    dateCreation
    dateDeclaration
    datePublication
  }
}

fragment PersonneMoraleIncompleteFragment on PersonneMoraleIncomplete {
  siret
}

fragment PersonnePhysiqueFragment on PersonnePhysique {
  civilite
  nom
  prenom
  email
}


fragment FileFragment on File {
  __typename
  filename
  contentType
  checksum
  byteSize: byteSizeBigInt
  url
  createdAt
}

fragment AddressFragment on Address {
  label
  streetAddress
  postalCode
  cityName
  cityCode
  departmentCode
}

fragment RegionFragment on Region {
  name
  code
}

fragment DepartementFragment on Departement {
  name
  code
}

fragment EpciFragment on Epci {
  name
  code
}

fragment CommuneFragment on Commune {
  name
  code
  postalCode
}

fragment RNFFragment on RNF {
  id
  title
  address {
    ...AddressFragment
  }
}

fragment PageInfoFragment on PageInfo {
  hasPreviousPage
  hasNextPage
  startCursor
  endCursor
}

`;