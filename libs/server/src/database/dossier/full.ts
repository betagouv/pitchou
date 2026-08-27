import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { withResolvedActivite } from "../activite.ts";
import { getControles } from "../controle.ts";
import { dossiersAccessibleViaCap, getEvenementsPhaseDossier } from "./access.ts";
import { dossierFullColumns, joinDossierIdentities } from "./fullColumns.ts";
import { formatDossierFull, type LoadedDossier } from "./fullFormat.ts";
import { getAvisExpertDossier, getDecisionsDossier, getPiecesJointes } from "./fullQueries.ts";
import { getImpactOnEspeces } from "../impact_espece/read.ts";
import { getOtherAttachmentsForDossier } from "../other_attachment.ts";
import { getPrescriptions } from "../prescription.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export function listAllDossiersFull(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFull[]> {
  return joinDossierIdentities(databaseConnection("dossier").select(dossierFullColumns)).then(
    (dossiers: DossierFull[]) => {
      for (const dossier of dossiers) {
        // @ts-ignore The aliased file fields are selected for URL construction.
        if (dossier.especes_impactees_id) {
          // @ts-ignore The URL is part of the historical list-all return shape.
          dossier.url_fichier_especes_impactees = `/especes-impactees/${dossier.especes_impactees_id}`;
        }
      }
      return dossiers.map(withResolvedActivite);
    },
  );
}

export async function getDossierFull(
  dossierId: DossierFull["id"],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFull | undefined> {
  const transaction: Knex.Transaction = databaseConnection.isTransaction
    ? (databaseConnection as Knex.Transaction)
    : await databaseConnection.transaction({ readOnly: true });
  if (!(await dossiersAccessibleViaCap(dossierId, cap, transaction)).has(dossierId)) {
    if (!databaseConnection.isTransaction) await transaction.commit();
    throw new TypeError(`Le dossier ${dossierId} n'est pas accessible via la cap ${cap}`);
  }
  const dossierP: Promise<LoadedDossier> = joinDossierIdentities(
    transaction("dossier")
      .select(dossierFullColumns)
      .join("edge_groupe_instructeurs__dossier", {
        "edge_groupe_instructeurs__dossier.dossier": "dossier.id",
      })
      .join("edge_cap_dossier__groupe_instructeurs", {
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
          "edge_groupe_instructeurs__dossier.groupe_instructeurs",
      }),
  )
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap, "dossier.id": dossierId })
    .first();
  const eventsP = getEvenementsPhaseDossier(dossierId, transaction);
  const avisP = getAvisExpertDossier(dossierId, transaction);
  const piecesP = getPiecesJointes(dossierId, transaction);
  const decisionsP = getDecisionsDossier(dossierId, transaction);
  const attachmentsP = getOtherAttachmentsForDossier(dossierId, transaction);
  const impactsP = getImpactOnEspeces(dossierId, transaction);
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
  ]);
  if (!databaseConnection.isTransaction) all.then(transaction.commit).catch(transaction.rollback);
  return all.then(
    ([dossier, events, avis, pieces, decisions, attachments, prescriptions, controles, impacts]) =>
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
        ),
      ),
  );
}
