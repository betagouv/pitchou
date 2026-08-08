export const champFragments = `
fragment ChampFragment on Champ {
  id
  label
  stringValue
  updatedAt
  ... on DateChamp { date }
  ... on DatetimeChamp { datetime }
  ... on CheckboxChamp { checked: value }
  ... on DecimalNumberChamp { decimalNumber: value }
  ... on IntegerNumberChamp { integerNumber: value }
  ... on CiviliteChamp { civilite: value }
  ... on LinkedDropDownListChamp { primaryValue secondaryValue }
  ... on MultipleDropDownListChamp { values }
  ... on PieceJustificativeChamp { files { ...FileFragment } }
  ... on AddressChamp {
    address { ...AddressFragment }
    commune { ...CommuneFragment }
    departement { ...DepartementFragment }
  }
  ... on EpciChamp {
    epci { ...EpciFragment }
    departement { ...DepartementFragment }
  }
  ... on CommuneChamp {
    commune { ...CommuneFragment }
    departement { ...DepartementFragment }
  }
  ... on DepartementChamp { departement { ...DepartementFragment } }
  ... on RegionChamp { region { ...RegionFragment } }
  ... on SiretChamp { etablissement { ...PersonneMoraleFragment } }
  ... on RNFChamp {
    rnf { ...RNFFragment }
    commune { ...CommuneFragment }
    departement { ...DepartementFragment }
  }
  ... on CarteChamp {
    geoAreas {
      id
      source
      description
      geometry { type coordinates }
    }
  }
}`;
