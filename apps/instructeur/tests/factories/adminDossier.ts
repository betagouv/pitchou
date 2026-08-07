import type { AdminDossierRelations } from "@pitchou/server/database/dossier_admin_relations.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

type PhysicalAdminDossierRelations = Extract<
  AdminDossierRelations,
  { demandeur_type: "personne_physique" }
>;

export function physicalAdminDossierRelations(
  groupeInstructeurs: GroupeInstructeursId,
  lastName: string,
  firstNames: string,
  email: string | null = null,
): PhysicalAdminDossierRelations {
  return {
    groupe_instructeurs: groupeInstructeurs,
    demandeur_type: "personne_physique",
    demandeur_personne_physique: {
      last_name: lastName,
      first_names: firstNames,
      email,
      address: null,
      phone: null,
      role: null,
    },
    demandeur_personne_morale: null,
    identites: [
      {
        type: "demandeur",
        last_name: lastName,
        first_names: firstNames,
        email,
        phone: null,
        role: null,
      },
    ],
  };
}
