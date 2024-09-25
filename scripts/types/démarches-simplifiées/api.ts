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

export interface Demandeur {
    prenom: string
    nom: string
    email: string
}

export interface Champ {
    id: string
    label: string
    stringValue: string
}

export interface BaseDossierDS {
    id: number
    number: number
    dateDepot: string 
    state: string
    demandeur: Demandeur
    champs: Champ[]
    annotations: Champ[]
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

export interface MutationError {
    message: string
    locations: [
        {
            line: number
            column: number
        }
    ],
    path: string
    extensions: {
        code: string
    }
}

export interface MutationResult {
    clientMutationId: string
    errors: MutationError[]
}

type PossibleAnnotationsMutations = "dossierModifierAnnotationDate" | "dossierModifierAnnotationText" | "dossierModifierAnnotationCheckbox"

export type AnnotationMutationResult = {
    [K in PossibleAnnotationsMutations]: MutationResult
}