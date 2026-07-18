import type { DossierDemarcheNumerique88444 } from "./Demarche88444";

export type ChampDescriptorTypename =
  | "TextChampDescriptor"
  | "DropDownListChampDescriptor"
  | "YesNoChampDescriptor"
  | "TextareaChampDescriptor"
  | "DateChampDescriptor"
  | "SiretChampDescriptor"
  | "MultipleDropDownListChampDescriptor"
  | "AddressChampDescriptor"
  | "PhoneChampDescriptor"
  | "EmailChampDescriptor"
  | "CheckboxChampDescriptor"
  | "IntegerNumberChampDescriptor"
  | "DecimalNumberChampDescriptor"
  | "DepartementChampDescriptor"
  | "RepetitionChampDescriptor"
  | "CommuneChampDescriptor"
  | "HeaderSectionChampDescriptor"
  | "PieceJustificativeChampDescriptor"
  | "ExplicationChampDescriptor"
  | "CarteChampDescriptor";

export interface ChampDescriptor {
  __typename: ChampDescriptorTypename;
  id: string;
  label: string;
  description: string;
  required: boolean;
  options?: string[];
  champDescriptors?: ChampDescriptor[]; // Seulement pour __typename === 'RepetitionChampDescriptor'
}

interface RevisionSchemaDemarcheSimplifiee {
  champDescriptors: ChampDescriptor[];
  annotationDescriptors: ChampDescriptor[];
}

export interface SchemaDemarcheSimplifiee {
  revision: RevisionSchemaDemarcheSimplifiee;
  number: number;
}

export type Dossier88444ChampDescriptor = Omit<ChampDescriptor, "label"> & {
  label: keyof DossierDemarcheNumerique88444;
};
