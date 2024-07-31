export interface DémarchesSimpliféesCommune{
    name: string
    code: string
    postalCode: string
}

interface GraphQLNodes<T>{
    nodes: T[]
}

type Dossier = any // PPP
type DeletedDossier = any // PPP

interface Instructeur{
    id: string
    email: string
}

export interface GroupeInstructeurs{
    label: string
    instructeur: Instructeur[]
}




export interface demarcheQueryResultDemarche{
    number: number
    groupeInstructeurs: GroupeInstructeurs[]
    dossiers: GraphQLNodes<Dossier[]>
    deletedDossiers: GraphQLNodes<DeletedDossier[]>
}

export interface demarcheQueryResult<DemarchePart>{
    demarche: DemarchePart
}