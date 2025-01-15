import { DossierComplet, DossierRésumé } from "../types/API_Pitchou.ts"
import Personne from "./database/public/Personne.ts"
import Message from "./database/public/Message.ts"

export interface PitchouInstructeurCapabilities{
    listerDossiers?: () => Promise<{dossiers: DossierRésumé[]}>
    recupérerDossierComplet?: (dossierId: DossierComplet['id']) => Promise<DossierComplet>
    listerRelationSuivi: () => Promise<{personneEmail: Personne['email'], dossiersSuivisIds: DossierRésumé['id'][]}[]>
    listerMessages?: (dossierId: DossierRésumé['id']) => Promise<Message[]>
    listerÉvènementsPhaseDossier: () => Promise<any[]>
    modifierDossier?: (dossierId: DossierRésumé['id'], dossier: Partial<DossierComplet>) => Promise<void> 
    remplirAnnotations?: (annotations: any) => Promise<void>
}

export interface IdentitéInstructeurPitchou{
    email: string
}
