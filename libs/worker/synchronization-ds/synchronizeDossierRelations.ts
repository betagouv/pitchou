import {
  dumpDossierMessages,
  getDossierIdsFromDS_Ids as getDossierIdsFromDNIds,
  synchronizeDossierInGroupeInstructeur,
} from "@pitchou/server/database/dossier.ts";
import { syncIdentitesDossier } from "@pitchou/server/database/identite_dossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
  IdentiteDossierData,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDS88444, Message } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";

type DossierForSync =
  DossierEntreprisesPersonneInitializersForInsert | DossierEntreprisesPersonneInitializersForUpdate;

export async function synchronizeDossierRelations(
  dossiersDS: DossierDS88444[],
  dossiersForSync: DossierForSync[],
  demarcheNumber: number,
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
  for (const { dossier } of dossiersForSync) {
    const dossierId = dossierIdByDNNumber.get(Number(dossier.demarche_numerique_number));
    if (dossierId) identitesByDossierId.set(dossierId, dossier.identites);
  }
  const messagesByDossierId = new Map<Dossier["id"], Message[]>();
  for (const { id, messages } of dossiersDS) {
    messagesByDossierId.set(dossierIdByDNId.get(id)!, messages);
  }

  // The notification is updated at the very end of the synchronization, once
  // every change — columns, identities, espèces and pièces jointes — is known.
  const synchronizations: unknown[] = [syncIdentitesDossier(identitesByDossierId, transaction)];
  if (messagesByDossierId.size >= 1) {
    synchronizations.push(dumpDossierMessages(messagesByDossierId, transaction));
  }
  if (dossiersDS.length >= 1) {
    synchronizations.push(
      synchronizeDossierInGroupeInstructeur(dossiersDS, demarcheNumber, transaction),
    );
  }
  return { dossierIdByDNNumber, synchronizations };
}
