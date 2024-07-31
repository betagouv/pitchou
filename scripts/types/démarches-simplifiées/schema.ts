export type ChampDescriptorTypename = 'TextChampDescriptor' | 'DropDownListChampDescriptor' | 'YesNoChampDescriptor' | 'TextareaChampDescriptor' | 'DateChampDescriptor';

export interface ChampDescriptor {
    __typename: ChampDescriptorTypename;
    id: string;
    label: string;
    description: string;
    required: boolean;
}
