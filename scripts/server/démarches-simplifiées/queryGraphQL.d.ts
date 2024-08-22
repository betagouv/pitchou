import {GroupeInstructeursQuery} from '../../server/démarches-simplifiées/recupérerGroupesInstructeurs.js'
import {demarcheQueryResult, demarcheQueryResultDemarche, GroupeInstructeurs} from "../../types/démarches-simplifiées/api.ts"

declare module './queryGraphQL.js' {
    export default function(token: string, query: GroupeInstructeursQuery, variables: {demarcheNumber: number}): Promise<demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'groupeInstructeurs'>>>;
}