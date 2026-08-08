export const entityFragments = `
fragment PersonneMoraleFragment on PersonneMorale {
  siret
  libelleNaf
  naf
  address { ...AddressFragment }
  entreprise {
    siren
    nomCommercial
    raisonSociale
    siretSiegeSocial
    formeJuridique
    dateCreation
    etatAdministratif
    capitalSocial
    codeEffectifEntreprise
  }
  association { rna titre objet dateCreation dateDeclaration datePublication }
}
fragment PersonneMoraleIncompleteFragment on PersonneMoraleIncomplete { siret }
fragment PersonnePhysiqueFragment on PersonnePhysique { civilite nom prenom email }
fragment FileFragment on File { filename contentType checksum url createdAt }
fragment AddressFragment on Address {
  label
  streetAddress
  postalCode
  cityName
  cityCode
  departmentCode
  departmentName
  regionName
}
fragment RegionFragment on Region { name code }
fragment DepartementFragment on Departement { name code }
fragment EpciFragment on Epci { name code }
fragment CommuneFragment on Commune { name code postalCode }
fragment RNFFragment on RNF { id title address { ...AddressFragment } }
fragment PageInfoFragment on PageInfo { hasPreviousPage hasNextPage startCursor endCursor }
`;
