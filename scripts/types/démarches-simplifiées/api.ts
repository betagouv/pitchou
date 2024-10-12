import {
    GroupeInstructeurs, 
    Dossier, 
    DeletedDossier, 
    PendingDeletedDossier,
    BaseChampDS
} from "./apiSchema.ts"

interface GraphQLNodes<T>{
    nodes: T[]
}

export interface demarcheQueryResultDemarche{
    number: number
    groupeInstructeurs: GroupeInstructeurs[]
    dossiers: GraphQLNodes<Dossier<BaseChampDS>>
    deletedDossiers: GraphQLNodes<DeletedDossier>
    pendingDeletedDossiers: GraphQLNodes<PendingDeletedDossier>
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
    extensions: object
}

export interface MutationResult {
    clientMutationId: string
    errors: MutationError[]
}

type PossibleAnnotationsMutations = "dossierModifierAnnotationDate" | "dossierModifierAnnotationText" | "dossierModifierAnnotationCheckbox"

export type AnnotationMutationResult = {
    [K in PossibleAnnotationsMutations]: MutationResult
}
