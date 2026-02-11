import { DossierComplet, DossierRésumé, DécisionAdministrativePourTransfer } from "../types/API_Pitchou.ts"
import Dossier from "./database/public/Dossier.ts"
import Personne from "./database/public/Personne.ts"
import Message from "./database/public/Message.ts"
import Notification from './database/public/Notification.ts'
import { ÉvènementMétrique } from './évènement.ts'

export interface PitchouInstructeurCapabilities {
	listerDossiers: () => Promise<DossierRésumé[]>
	recupérerDossierComplet: (dossierId: DossierComplet['id']) => Promise<DossierComplet>
	listerRelationSuivi: () => Promise<{ personneEmail: Personne['email']; dossiersSuivisIds: Dossier['id'][] }[]>
	modifierRelationSuivi: (
		direction: 'suivre' | 'laisser',
		personneEmail: NonNullable<Personne['email']>,
		dossierId: Dossier['id'],
	) => Promise<void>
	listerMessages: (dossierId: DossierRésumé['id']) => Promise<Message[]>
	listerÉvènementsPhaseDossier: () => Promise<any[]>
	modifierDossier: (dossierId: Dossier['id'], dossier: Partial<DossierComplet>) => Promise<void>
	remplirAnnotations: (annotations: any) => Promise<void>
	modifierDécisionAdministrativeDansDossier: (
		décisionAdministrative: DécisionAdministrativePourTransfer,
	) => Promise<void>
	créerÉvènementMetrique: (évènement: ÉvènementMétrique) => Promise<void>
	listerNotifications: () => Promise<Notification[]>
}

export interface IdentitéInstructeurPitchou{
    email: string
}
