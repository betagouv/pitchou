import {
  dumpDossierMessages,
  getDossierIdsFromDS_Ids as getDossierIdsFromDNIds,
} from "@pitchou/server/database/dossier.ts";
import { syncIdentitesDossier } from "@pitchou/server/database/identite_dossier.ts";
import { savePorteursDeProjetAndActeurs } from "@pitchou/server/database/dossier_acteur.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
  IdentiteDossierData,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";
import type { DossierActeurData } from "@pitchou/types/dossierActeur.ts";
import type { DossierDS88444, Message } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";

type DossierForSync =
  | DossierEntreprisesPersonneInitializersForInsert
  | DossierEntreprisesPersonneInitializersForUpdate;

export async function synchronizeDossierRelations(
  dossiersDS: DossierDS88444[],
  dossiersForSync: DossierForSync[],
  _demarcheNumber: number,
  transaction: Knex.Transaction,
) {
  const dossierIds = await getDossierIdsFromDNIds(
    dossiersDS.map(({ id }) => id),
    transaction,
  );
  const dossierIdByDNId = new Map<string, Dossier["id"]>();
  const dossierIdByDNNumber = new Map<number, Dossier["id"]>();
  for (const { id, demarche_numerique_id, demarche_numerique_number } of dossierIds) {
    dossierIdByDNId.set(demarche_numerique_id, id);
    dossierIdByDNNumber.set(Number(demarche_numerique_number), id);
  }

  const identitesByDossierId = new Map<Dossier["id"], IdentiteDossierData[]>();
  const porteurByDossierId = new Map<Dossier["id"], PorteurDeProjetInitializer>();
  const acteursByDossierId = new Map<Dossier["id"], DossierActeurData[]>();
  for (const { dossier } of dossiersForSync) {
    const dossierId = dossierIdByDNNumber.get(Number(dossier.demarche_numerique_number));
    if (dossierId) {
      identitesByDossierId.set(dossierId, dossier.identites);
      porteurByDossierId.set(dossierId, dossier.porteur_de_projet);
      acteursByDossierId.set(dossierId, dossier.acteurs);
    }
  }
  const messagesByDossierId = new Map<Dossier["id"], Message[]>();
  for (const { id, messages } of dossiersDS) {
    messagesByDossierId.set(dossierIdByDNId.get(id)!, messages);
  }

  // The notification is updated at the very end of the synchronization, once
  // every change — columns, acteurs, espèces and pièces jointes — is known.
  // The acteurs are kept apart from the other synchronizations because the
  // caller needs the dossiers they changed.
  const acteursSynchronization = savePorteursDeProjetAndActeurs(
    porteurByDossierId,
    acteursByDossierId,
    transaction,
  );
  const synchronizations: unknown[] = [syncIdentitesDossier(identitesByDossierId, transaction)];
  if (messagesByDossierId.size > 0) {
    synchronizations.push(dumpDossierMessages(messagesByDossierId, transaction));
  }
  return { dossierIdByDNNumber, acteursSynchronization, synchronizations };
}
