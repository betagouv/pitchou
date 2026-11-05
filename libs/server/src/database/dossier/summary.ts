import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { withResolvedActivite } from "../activite.ts";
import { getAvisExpertFilesForUser } from "../avis_expert.ts";
import { getDecisionsAdministratives } from "../decision_administrative.ts";
import { dossierAccessQuery, getLatestEvenementsPhaseDossiers } from "./access.ts";
import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { joinPorteurDeProjet, porteurDeProjetColumns, withPorteurDeProjet } from "./porteur.ts";
import { getDossierActeurs } from "./acteurs.ts";
import { summaryInvolvements } from "@pitchou/common/dossierActeur.ts";
import { withProjetMembership } from "./projet.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { DossierSummary, FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

const columns = [
  "dossier.id as id",
  "demarche_numerique_number",
  "depot_date",
  "dossier.name as name",
  "linked_to_ae_regime",
  "main_activite",
  "activite.code as activite_code",
  "activite.label as activite_label",
  "dossier.source as source",
  "departments",
  "communes",
  "regions",
  "location_scope",
  "primary_department",
  "next_action_expected_from",
  "enjeu",
  "onagre_demande_identifier",
  ...porteurDeProjetColumns,
] as (keyof DossierSummary)[];

export async function getDossiersSummariesForUser(
  userId: UserId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
  dossierIds?: Dossier["id"][],
): Promise<DossierSummary[]> {
  if (dossierIds?.length === 0) return [];
  const transaction: Knex.Transaction = databaseConnection.isTransaction
    ? (databaseConnection as Knex.Transaction)
    : await databaseConnection.transaction({ readOnly: true });
  try {
    const dossiers = await loadDossierSummaries(userId, transaction, dossierIds);
    const events = await getLatestEvenementsPhaseDossiers(userId, transaction, dossierIds);
    const decisions = await getDecisionsAdministratives(userId, transaction, dossierIds);
    const avis = await getAvisExpertFilesForUser(userId, transaction, dossierIds);
    const acteurs = await getDossierActeurs(
      dossiers.map(({ id }) => id),
      transaction,
      summaryInvolvements,
    );
    const eventByDossier = new Map<Dossier["id"], EvenementPhaseDossier>(
      events.map((event) => [event.dossier, event]),
    );
    for (const dossier of dossiers) {
      dossier.acteurs = acteurs.get(dossier.id) ?? [];
      const event = eventByDossier.get(dossier.id);
      dossier.phase = event?.phase ?? "Accompagnement amont";
      dossier.phase_start_date = event ? event.timestamp : dossier.depot_date;
    }
    const decisionsByDossier = new Map<Dossier["id"], FrontEndDecisionAdministrative[]>();
    for (const decision of decisions) {
      const values = decisionsByDossier.get(decision.dossier) || [];
      values.push(decision);
      decisionsByDossier.set(decision.dossier, values);
    }
    for (const dossier of dossiers) {
      const values = decisionsByDossier.get(dossier.id);
      if (values) dossier.decisionsAdministratives = values;
    }
    const avisByDossier = new Map<Dossier["id"], DossierSummary["avisExperts"]>();
    for (const { dossier, expert, hasSaisineFile, hasAvisFile } of avis) {
      const values = avisByDossier.get(dossier) ?? [];
      values.push({ expert, hasSaisineFile, hasAvisFile });
      avisByDossier.set(dossier, values);
    }
    for (const dossier of dossiers) {
      dossier.avisExperts = avisByDossier.get(dossier.id) ?? [];
      if (dossier.access === "lecture") {
        delete dossier.latestCommentaire;
        dossier.avisExperts = dossier.avisExperts
          .filter(({ expert }) => isOfficialAvisExpert(expert))
          .map(({ expert, hasAvisFile }) => ({ expert, hasAvisFile }));
      }
    }
    if (!databaseConnection.isTransaction) await transaction.commit();
    return dossiers;
  } catch (error) {
    if (!databaseConnection.isTransaction) await transaction.rollback();
    throw error;
  }
}

function loadDossierSummaries(
  userId: UserId,
  transaction: Knex.Transaction,
  dossierIds?: Dossier["id"][],
): Promise<DossierSummary[]> {
  const accessible = dossierAccessQuery(userId, transaction);
  if (dossierIds) accessible.whereIn("dossier.id", dossierIds);
  return (
    withProjetMembership(joinPorteurDeProjet(transaction("dossier")), transaction, { batch: true })
      .withMaterialized("accessible_dossiers", accessible)
      .select(columns)
      // A SQL DATE must not acquire the server process's timezone through the pg date parser.
      .select(
        transaction.raw("dossier.next_due_date::timestamp at time zone 'UTC' as next_due_date"),
      )
      .select("dossier_access.access")
      // CD_REF of every espece the dossier impacts. A dossier can hold impacts without a file, and a
      // file that could not be imported holds none, so the array doubles as the « renseignee » flag.
      .select(
        transaction.raw(`coalesce(impacts.cd_refs, '{}'::text[]) as "especesImpacteesCD_REF"`),
      )
      .leftJoin(
        transaction("impact_espece")
          .select("dossier")
          .select(transaction.raw("array_agg(distinct cd_ref) as cd_refs"))
          .whereIn("dossier", transaction("accessible_dossiers").select("dossier"))
          .groupBy("dossier")
          .as("impacts"),
        "impacts.dossier",
        "dossier.id",
      )
      .leftJoin(
        transaction("commentaire")
          .distinctOn("dossier")
          .select("dossier", "content")
          .whereIn("dossier", transaction("accessible_dossiers").select("dossier"))
          .orderBy("dossier")
          .orderBy("created_at", "desc")
          .orderBy("id", "desc")
          .as("latest_commentaire"),
        "latest_commentaire.dossier",
        "dossier.id",
      )
      .select("latest_commentaire.content as latestCommentaire")
      .join("accessible_dossiers as dossier_access", "dossier_access.dossier", "dossier.id")
      // Only reviewed labels resolve to an activity; labels pending review keep their raw display
      // through the fallback in `withResolvedActivite`.
      .leftJoin("activite_label", (join) =>
        join
          .on("activite_label.label", "dossier.main_activite")
          .andOnVal("activite_label.needs_review", false),
      )
      .leftJoin("activite", { "activite.code": "activite_label.activite_code" })
      .then((dossiers: DossierSummary[]) =>
        dossiers.map((dossier) => {
          dossier.especesImpacteesRenseignees = dossier.especesImpacteesCD_REF.length > 0;
          return withResolvedActivite(withPorteurDeProjet(dossier));
        }),
      )
  );
}
