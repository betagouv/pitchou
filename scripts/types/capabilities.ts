import { DossierComplet } from "../types"
import Personne from "./database/public/Personne"
import Dossier from "./database/public/Dossier"
import Message from "./database/public/Message"

export interface PitchouInstructeurCapabilities{
    listerDossiers?: () => Promise<DossierComplet[]>
    listerRelationSuivi: () => Promise<{personneEmail: Personne['email'], dossiersSuivisIds: Dossier['id'][]}[]>
    listerMessages?: (dossierId: DossierComplet['id']) => Promise<Message[]>
    modifierDossier?: (dossierId: DossierComplet['id'], dossier: any) => Promise<void> 
    remplirAnnotations?: (annotations: any) => Promise<void>
}

export interface IdentitéInstructeurPitchou{
    email: string
}
