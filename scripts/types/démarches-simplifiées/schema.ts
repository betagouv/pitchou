export type ChampDescriptorTypename = 
    | 'TextChampDescriptor' 
    | 'DropDownListChampDescriptor' 
    | 'YesNoChampDescriptor' 
    | 'TextareaChampDescriptor' 
    | 'DateChampDescriptor'
    | 'SiretChampDescriptor'
    | 'MultipleDropDownListChampDescriptor'
    | 'AddressChampDescriptor'
    | 'PhoneChampDescriptor'
    | 'EmailChampDescriptor'
    | 'CheckboxChampDescriptor'
    | 'IntegerNumberChampDescriptor'
    | 'DecimalNumberChampDescriptor' 
    | 'DepartementChampDescriptor'
    | 'RepetitionChampDescriptor'
    | 'CommuneChampDescriptor'
    | 'HeaderSectionChampDescriptor'
    | 'PieceJustificativeChampDescriptor'

export interface ChampDescriptor {
    __typename: ChampDescriptorTypename;
    id: string;
    label: string;
    description: string;
    required: boolean;
    options?: string[]
    champDescriptors?: ChampDescriptor[] // Seulement pour __typename === 'RepetitionChampDescriptor'
}


interface RevisionSchemaDémarcheSimplifiée{
    champDescriptors: ChampDescriptor[]
    annotationDescriptors: ChampDescriptor[]
}

export interface SchemaDémarcheSimplifiée {
    revision: RevisionSchemaDémarcheSimplifiée
}