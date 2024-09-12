import { DossierComplet } from "../types"

export interface PitchouInstructeurCapabilities{
    listerDossiers?: () => Promise<DossierComplet[]>
    modifierDossier?: (dossierId: DossierComplet['id'], dossier: any) => Promise<void> 
    remplirAnnotations?: (annotations: any) => Promise<void>
}
