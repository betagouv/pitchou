export interface BaseChampDS {
  id: string;
  champDescriptorId: string;
  __typename: string;
  label: string;
  stringValue: string;
  updatedAt: string; // ISO8601DateTime
  prefilled: boolean;
}

export interface ChampDSCheckbox extends BaseChampDS {
  value: boolean;
  checked: boolean;
}
export interface ChampDSDate extends BaseChampDS {
  date: string; // ISO8601Date
}

interface BaseRepetitionChampsDS<ChampDSSpecific> extends BaseChampDS {
  rows: {
    champs: ChampDSSpecific[];
  }[];
}

export interface DemandeurDS {
  prenom: string;
  nom: string;
  email: string | null;
}

export interface DémarchesSimpliféesCommune {
  name: string;
  code: string;
  postalCode: string;
}

export interface DémarchesSimpliféesDépartement {
  name: string;
  code: string;
}

interface ChampDSCommune extends BaseChampDS {
  commune: DémarchesSimpliféesCommune;
  departement: DémarchesSimpliféesDépartement;
}

export type ChampDSCommunes = BaseRepetitionChampsDS<ChampDSCommune>;

export interface ChampDSDépartement extends BaseChampDS {
  departement: DémarchesSimpliféesDépartement;
}

export type ChampDSDépartements = BaseRepetitionChampsDS<ChampDSDépartement>;

export interface ChampDSRégion extends BaseChampDS {
  region: {
    code: string;
    name: string;
  };
}

export type ChampDSRégions = BaseRepetitionChampsDS<ChampDSRégion>;

export type ChampScientifiqueIntervenants = BaseRepetitionChampsDS<BaseChampDS>;

/**
 * @see {@link https://www.demarches-simplifiees.fr/graphql/schema/types/Address}
 */
export interface DémarchesSimpliféesAddress {
  label: string;
  streetAddress: string | null;
  postalCode: string;
  cityName: string;
  cityCode: string;
  departmentCode: string | null;
  departmentName: string | null;
  regionCode: string | null;
  regionName: string | null;
}

/** "Adresse" champ backed by the Base Adresse Nationale (BAN). */
export interface ChampDSAddress extends BaseChampDS {
  address: DémarchesSimpliféesAddress | null;
  commune: DémarchesSimpliféesCommune | null;
  departement: DémarchesSimpliféesDépartement | null;
}

/**
 * @see {@link https://www.demarches-simplifiees.fr/graphql/schema/types/Entreprise}
 */
export interface DémarchesSimpliféesEntreprise {
  siren: string;
  raisonSociale: string;
  nomCommercial: string;
  siretSiegeSocial: string;
  formeJuridique: string | null;
  dateCreation: string | null; // ISO8601Date
  etatAdministratif: "Actif" | "Ferme" | null;
  capitalSocial: string | null; // BigInt, "-1" when unknown
  codeEffectifEntreprise: string | null; // INSEE "tranche d'effectif salarié" code
}

/**
 * The establishment (personne morale) returned by a SIRET champ.
 * @see {@link https://www.demarches-simplifiees.fr/graphql/schema/types/PersonneMorale}
 */
export interface DémarchesSimpliféesEtablissement {
  siret: string;
  address: DémarchesSimpliféesAddress | null;
  libelleNaf: string | null;
  naf: string | null;
  entreprise: DémarchesSimpliféesEntreprise | null;
}

/** "Numéro de SIRET" champ. */
export interface ChampDSSiret extends BaseChampDS {
  etablissement: DémarchesSimpliféesEtablissement | null;
}

export interface DSFile {
  filename: string;
  url: string;
  contentType: string;
  createdAt: string; // ISO8601DateTime
  byteSize: string; // parseable as number, censé être déprécié
  byteSizeBigInt: string; // parseable as number
  checksum: string;
}

export interface ChampDSPieceJustificative extends BaseChampDS {
  files: DSFile[];
}

/**
 * A geographic area drawn by the usager in a "Carte" champ (CarteChamp).
 * @see {@link https://www.demarches-simplifiees.fr/graphql/schema/types/GeoArea}
 */
export interface ChampDSGeoArea {
  id: string;
  source: string; // GeoAreaSource: "selection_utilisateur", "cadastre", "rpg"…
  description: string | null;
  geometry: unknown; // GeoJSON scalar, returned as an already-parsed geometry object
}

/** "Cartographie du projet" champ (CarteChamp): areas drawn on a base map. */
export interface ChampDSCarte extends BaseChampDS {
  geoAreas: ChampDSGeoArea[];
}

export type ChampRépétéDSPieceJustificative = BaseRepetitionChampsDS<ChampDSPieceJustificative>;

export type DeletedDossier = any; // PPP
export type PendingDeletedDossier = any; // PPP

export interface Instructeur {
  id: string;
  email: string;
}

export interface GroupeInstructeurs {
  label: string;
  instructeurs: Instructeur[];
}

export interface Message {
  id: string;
  email: string;
  body: string;
  createdAt: string; // représentant une date
  attachments: any[];
}

export interface Traitement {
  state: "en_construction" | "en_instruction" | "accepte" | "sans_suite" | "refuse";
  emailAgentTraitant: string | null;
  dateTraitement: string; // représentant une date
  motivation: string | null;
}

export type Champs88444 =
  | BaseChampDS
  | ChampDSCheckbox
  | ChampDSCommune
  | ChampDSDépartement
  | ChampDSRégions
  | ChampDSPieceJustificative
  | ChampDSAddress
  | ChampDSSiret
  | ChampDSCarte;
export type Annotations88444 = BaseChampDS | ChampDSCheckbox | ChampDSDate;

/**
 * @see {@link https://www.demarches-simplifiees.fr/graphql/schema/types/Profile}
 */
export type Profile = {
  // id
  email: string;
};

export interface DossierDS<Champs, Annotations> {
  id: string;
  number: number;
  dateDepot: Date;
  state: string;
  // Profil d'un usager connecté (déposant un dossier, instruisant un dossier...)
  usager: Profile;
  // Prénom et nom de la personne qui dépose le dossier sur DS au nom du demandeur DS
  prenomMandataire: string;
  nomMandataire: string;
  // Personne qui formule la demande dans DS
  demandeur: DemandeurDS;
  groupeInstructeur: GroupeInstructeurs;
  instructeurs: Instructeur[];
  messages: Message[];
  traitements: Traitement[];
  motivationAttachment: DSFile;
  champs: Champs[];
  annotations: Annotations[];

  // Pour les notifications
  dateDerniereModification: Date;
}

export type DossierDS88444 = DossierDS<Champs88444, Annotations88444>;
