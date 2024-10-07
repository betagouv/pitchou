import { DossierComplet } from "../types"
import Message from "./database/public/Message"

export interface PitchouInstructeurCapabilities{
    listerDossiers?: () => Promise<DossierComplet[]>
    listerMessages?: (dossierId: DossierComplet['id']) => Promise<Message[]>
    modifierDossier?: (dossierId: DossierComplet['id'], dossier: any) => Promise<void> 
    remplirAnnotations?: (annotations: any) => Promise<void>
}
