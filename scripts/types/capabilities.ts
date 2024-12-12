import { DossierComplet, DossierRésumé } from "../types/API_Pitchou.ts"
import Personne from "./database/public/Personne.ts"
import Message from "./database/public/Message.ts"
import ÉvènementPhaseDossier from "./database/public/ÉvènementPhaseDossier"

export interface PitchouInstructeurCapabilities{
    listerDossiers?: () => Promise<{dossiers: DossierComplet[], évènementsPhaseDossier: ÉvènementPhaseDossier[]}>
    listerRelationSuivi: () => Promise<{personneEmail: Personne['email'], dossiersSuivisIds: DossierRésumé['id'][]}[]>
    listerMessages?: (dossierId: DossierRésumé['id']) => Promise<Message[]>
    listerÉvènementsPhaseDossier: () => Promise<any[]>
    modifierDossier?: (dossierId: DossierRésumé['id'], dossier: Partial<DossierComplet>) => Promise<void> 
    remplirAnnotations?: (annotations: any) => Promise<void>
}

export interface IdentitéInstructeurPitchou{
    email: string
}
