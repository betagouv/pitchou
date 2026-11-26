import type { Knex } from "knex";
import { withCalendarDateJSON } from "@pitchou/common/calendarDate.ts";
import type { DossierAccess, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import { dossierReadScope } from "@pitchou/types/externalApi.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { ExternalApiPrincipal } from "../externalApi.ts";
import { directDatabaseConnection } from "../connection.ts";
import { withResolvedActivite } from "../activite.ts";
import { getDossierActeurs } from "../dossier/acteurs.ts";
import { latestCommentaireExpression } from "../commentaire.ts";
import {
  dossierProjectColumns,
  joinDossierActivite,
  joinDossierIdentities,
} from "../dossier/fullColumns.ts";
import { withPorteurDeProjet } from "../dossier/porteur.ts";
import { orderPhaseEvents } from "../phaseHistory.ts";
import { externalDossiers } from "./access.ts";

export const statusByPhase = {
  "Accompagnement amont": "accompagnement_amont",
  "Étude recevabilité": "etude_recevabilite",
  Instruction: "instruction",
  Contrôle: "controle",
  "Classé sans suite": "classe_sans_suite",
  "Obligations terminées": "obligations_terminees",
} as const satisfies Record<DossierPhase, string>;
export function formatStatus(phase: DossierPhase | null, timestamp: Date | null) {
  const status = statusByPhase[phase ?? "Accompagnement amont"];
  if (typeof status !== "string") throw new Error("Unknown dossier phase");
  return { status, status_changed_at: timestamp?.toISOString() ?? null };
}

function withLatestPhase(query: Knex.QueryBuilder, db: Knex) {
  const latestPhase = db("evenement_phase_dossier")
    .select("phase", "timestamp")
    .where("evenement_phase_dossier.dossier", db.ref("dossier.id"))
    .modify(orderPhaseEvents)
    .limit(1)
    .toSQL();
  return query.joinRaw(`LEFT JOIN LATERAL (${latestPhase.sql}) AS latest_phase ON true`, [
    ...latestPhase.bindings,
  ]);
}

const accessByLevel = {
  lecture: "restricted",
  lecture_complete: "full_read",
  complet: "full",
} as const satisfies Record<DossierAccess, string>;

export type DossierListFilters = {
  after: number;
  limit: number;
  phase?: DossierPhase;
  department?: string;
  search?: string;
  followed?: boolean;
};

function selectPersonalDossierFields(
  query: Knex.QueryBuilder,
  userId: UserId,
  followed: boolean | undefined,
  db: Knex,
) {
  const follow = db("edge_personne_follows_dossier")
    .select("dossier")
    .where("dossier", db.ref("dossier.id"))
    .where("personne", userId);
  joinDossierActivite(query).select(
    db.raw("exists (?) as followed", [follow]),
    "access.access as dossier_access",
    "dossier.departments",
    "dossier.communes",
    "dossier.regions",
    "dossier.location_scope",
    "dossier.enjeu",
    "dossier.linked_to_ae_regime",
    "dossier.next_action_expected_from",
    "dossier.next_due_date",
    "activite.code as activite_code",
    "activite.label as activite_label",
    db.raw(
      "array(select distinct cd_ref from impact_espece where impact_espece.dossier = dossier.id order by cd_ref) as impacted_espece_cd_refs",
    ),
    // Apply the UI's comment visibility before selecting the comment text.
    db.raw(
      `case when access.access <> 'lecture' then ${latestCommentaireExpression} end as latest_comment`,
    ),
  );
  if (followed === true) query.whereExists(follow);
  if (followed === false) query.whereNotExists(follow);
}

export async function listExternalDossiers(
  principal: ExternalApiPrincipal,
  filters: DossierListFilters,
  db: Knex = directDatabaseConnection,
) {
  const query = externalDossiers(principal, dossierReadScope, db).where(
    "dossier.id",
    ">",
    filters.after,
  );
  if (filters.department) query.where("dossier.primary_department", filters.department);
  const { search } = filters;
  if (search) {
    const pattern = `%${search.replaceAll(/[\\%_]/gu, "\\$&")}%`;
    query.where((match) =>
      match
        .whereILike("dossier.name", pattern)
        .orWhereILike("dossier.onagre_demande_identifier", pattern)
        .orWhereRaw("dossier.id::text = ? OR dossier.demarche_numerique_number::text = ?", [
          search,
          search,
        ]),
    );
  }
  if (principal.kind === "personal") {
    selectPersonalDossierFields(query, principal.userId, filters.followed, db);
  }
  withLatestPhase(query, db);
  if (filters.phase) {
    query.whereRaw("coalesce(latest_phase.phase, ?) = ?", ["Accompagnement amont", filters.phase]);
  }
  const rows = await query
    .select(
      "dossier.id",
      "dossier.name",
      "dossier.source",
      "dossier.demarche_numerique_number",
      "dossier.onagre_demande_identifier",
      "dossier.primary_department",
      "dossier.depot_date as submission_date",
      "dossier.main_activite",
      "latest_phase.phase",
      "latest_phase.timestamp",
    )
    .orderBy("dossier.id")
    .limit(filters.limit + 1)
    .timeout(5000, { cancel: true });
  return {
    dossiers: rows
      .slice(0, filters.limit)
      .map(({ phase, timestamp, dossier_access, next_due_date, latest_comment, ...dossier }) => ({
        ...(dossier_access ? withResolvedActivite(dossier) : dossier),
        ...formatStatus(phase, timestamp),
        ...(dossier_access && {
          access: accessByLevel[dossier_access as DossierAccess],
          next_due_date: withCalendarDateJSON(next_due_date),
          ...(dossier_access !== "lecture" && { latest_comment }),
        }),
      })),
    next_cursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null,
  };
}

export async function readExternalDossier(
  dossierId: DossierId,
  access: DossierAccess,
  trx: Knex.Transaction,
) {
  const query = joinDossierIdentities(trx("dossier").select(dossierProjectColumns));
  const {
    phase,
    timestamp,
    depot_date: submissionDate,
    ddep_depot_date: ddepSubmissionDate,
    projet_map: projectMap,
    ...dossier
  } = await withLatestPhase(query, trx)
    .where("dossier.id", dossierId)
    .first("latest_phase.phase", "latest_phase.timestamp");
  const acteurs = await getDossierActeurs([dossierId], trx);
  return {
    ...withResolvedActivite(withPorteurDeProjet(dossier)),
    ...formatStatus(phase, timestamp),
    intervention_start_date: withCalendarDateJSON(dossier.intervention_start_date),
    intervention_end_date: withCalendarDateJSON(dossier.intervention_end_date),
    next_due_date: withCalendarDateJSON(dossier.next_due_date),
    public_consultation_start_date: withCalendarDateJSON(dossier.public_consultation_start_date),
    public_consultation_end_date: withCalendarDateJSON(dossier.public_consultation_end_date),
    commissioning_date: withCalendarDateJSON(dossier.commissioning_date),
    submission_date: submissionDate,
    ddep_submission_date: withCalendarDateJSON(ddepSubmissionDate),
    project_map: projectMap,
    acteurs: acteurs.get(dossierId) ?? [],
    access: accessByLevel[access],
  };
}
