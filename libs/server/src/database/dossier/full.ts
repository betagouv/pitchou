import { withCalendarDateJSON } from "@pitchou/common/calendarDate.ts";
import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { withResolvedActivite } from "../activite.ts";
import { getControles } from "../controle.ts";
import { dossiersAccessibleToUser, getEvenementsPhaseDossier } from "./access.ts";
import { dossierFullColumns, joinDossierIdentities } from "./fullColumns.ts";
import { latestCommentaireSubquery } from "../commentaire.ts";
import { formatDossierFull, type LoadedDossier } from "./fullFormat.ts";
import { getDossierActeurs } from "./acteurs.ts";
import { getAvisExpertDossier, getDecisionsDossier, getPiecesJointes } from "./fullQueries.ts";
import { getImpactOnEspeces } from "../impact_espece/read.ts";
import { getOtherAttachmentsForDossier } from "../other_attachment.ts";
import { getPrescriptions } from "../prescription.ts";
import { getDossierCnpnEmailSentEvents } from "../dossier_cnpn_email.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export async function getDossierFull(
  dossierId: DossierFull["id"],
  userId: UserId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFull | undefined> {
  const transaction: Knex.Transaction = databaseConnection.isTransaction
    ? (databaseConnection as Knex.Transaction)
    : await databaseConnection.transaction({ readOnly: true });
  try {
    if (!(await dossiersAccessibleToUser(dossierId, userId, transaction)).has(dossierId)) {
      throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la userId ${userId}`);
    }
    // Access was checked above, so the fetch itself selects the dossier by id.
    const dossier = await loadDossier(dossierId, transaction);
    const events = await getEvenementsPhaseDossier(dossierId, transaction);
    const avis = await getAvisExpertDossier(dossierId, transaction);
    const pieces = await getPiecesJointes(dossierId, transaction);
    const decisions = await getDecisionsDossier(dossierId, transaction);
    const attachments = await getOtherAttachmentsForDossier(dossierId, transaction);
    const impacts = await getImpactOnEspeces(dossierId, transaction);
    const cnpnEmailSentEvents = await getDossierCnpnEmailSentEvents(dossierId, transaction);
    const prescriptions = await getPrescriptions(
      decisions.map(({ id }) => id),
      transaction,
    );
    const controles = await getControles(
      prescriptions.map(({ id }) => id),
      transaction,
    );
    const result = withResolvedActivite(
      formatDossierFull(
        dossier,
        events,
        avis,
        pieces,
        decisions,
        attachments,
        prescriptions,
        controles,
        impacts,
        cnpnEmailSentEvents,
      ),
    );
    if (!databaseConnection.isTransaction) await transaction.commit();
    return result;
  } catch (error) {
    if (!databaseConnection.isTransaction) await transaction.rollback();
    throw error;
  }
}

async function loadDossier(
  dossierId: DossierFull["id"],
  transaction: Knex.Transaction,
): Promise<LoadedDossier> {
  const dossier = await joinDossierIdentities(
    transaction("dossier")
      .select(dossierFullColumns)
      .select(transaction.raw(latestCommentaireSubquery)),
  )
    .where({ "dossier.id": dossierId })
    .first();
  const acteurs = await getDossierActeurs([dossierId], transaction);
  dossier.ddep_depot_date = withCalendarDateJSON(dossier.ddep_depot_date);
  dossier.acteurs = acteurs.get(dossierId) ?? [];
  return dossier;
}
