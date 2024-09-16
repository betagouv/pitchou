export interface DémarchesSimpliféesCommune{
    name: string
    code: string
    postalCode: string
}

export interface DémarchesSimpliféesDépartement{
    name: string
    code: string
}

interface GraphQLNodes<T>{
    nodes: T[]
}

type Dossier = any // PPP
type DeletedDossier = any // PPP
type PendingDeletedDossier = any // PPP

export interface Instructeur{
    id: string
    email: string
}


export interface GroupeInstructeurs{
    label: string
    instructeurs: Instructeur[]
}


export interface demarcheQueryResultDemarche{
    number: number
    groupeInstructeurs: GroupeInstructeurs[]
    dossiers: GraphQLNodes<Dossier[]>
    deletedDossiers: GraphQLNodes<DeletedDossier[]>
    pendingDeletedDossiers: GraphQLNodes<PendingDeletedDossier[]>
}

export interface demarcheQueryResult<DemarchePart>{
    demarche: DemarchePart
}
