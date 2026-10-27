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
  if (!(await dossiersAccessibleToUser(dossierId, userId, transaction)).has(dossierId)) {
    if (!databaseConnection.isTransaction) await transaction.commit();
    throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la userId ${userId}`);
  }
  // Access was checked above, so the fetch itself selects the dossier by id.
  const dossierP = loadDossier(dossierId, transaction);
  const eventsP = getEvenementsPhaseDossier(dossierId, transaction);
  const avisP = getAvisExpertDossier(dossierId, transaction);
  const piecesP = getPiecesJointes(dossierId, transaction);
  const decisionsP = getDecisionsDossier(dossierId, transaction);
  const attachmentsP = getOtherAttachmentsForDossier(dossierId, transaction);
  const impactsP = getImpactOnEspeces(dossierId, transaction);
  const cnpnEmailSentEventsP = getDossierCnpnEmailSentEvents(dossierId, transaction);
  const prescriptionsP = decisionsP.then((decisions) =>
    getPrescriptions(
      decisions.map(({ id }) => id),
      transaction,
    ),
  );
  const controlesP = prescriptionsP.then((prescriptions) =>
    getControles(
      prescriptions.map(({ id }) => id),
      transaction,
    ),
  );
  const all = Promise.all([
    dossierP,
    eventsP,
    avisP,
    piecesP,
    decisionsP,
    attachmentsP,
    prescriptionsP,
    controlesP,
    impactsP,
    cnpnEmailSentEventsP,
  ]);
  if (!databaseConnection.isTransaction) all.then(transaction.commit).catch(transaction.rollback);
  return all.then(
    ([
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
    ]) =>
      withResolvedActivite(
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
      ),
  );
}

async function loadDossier(
  dossierId: DossierFull["id"],
  transaction: Knex.Transaction,
): Promise<LoadedDossier> {
  const [dossier, acteurs] = await Promise.all([
    joinDossierIdentities(
      transaction("dossier")
        .select(dossierFullColumns)
        .select(transaction.raw(latestCommentaireSubquery)),
    )
      .where({ "dossier.id": dossierId })
      .first(),
    getDossierActeurs([dossierId], transaction),
  ]);
  dossier.ddep_depot_date = withCalendarDateJSON(dossier.ddep_depot_date);
  dossier.acteurs = acteurs.get(dossierId) ?? [];
  return dossier;
}
