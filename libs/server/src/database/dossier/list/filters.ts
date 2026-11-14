import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { OFFICIAL_AVIS_EXPERTS } from "@pitchou/common/avisExpert.ts";
import { normalizedSql, type ListParams } from "./params.ts";
import { visibleFollows } from "./relations.ts";

export function applyFilters(
  query: Knex.QueryBuilder,
  db: Knex,
  userId: UserId,
  params: ListParams,
) {
  if (params.source) query.where("d.source", params.source);
  if (params.departmentSelection === "none") query.whereRaw("false");
  if (params.departmentSelection === "custom")
    query.whereRaw(
      "exists (select 1 from json_array_elements_text(d.departments) dep(value) where dep.value = any(?::text[]))",
      [params.departments],
    );
  if (params.phase.length > 0)
    query.whereRaw("coalesce(phase.phase, 'Accompagnement amont') = any(?::text[])", [
      params.phase,
    ]);
  if (params.activite.length > 0)
    query.whereRaw(
      "coalesce(activite.code, case when nullif(d.main_activite, '') is not null then 'autre' end) = any(?::text[])",
      [params.activite],
    );
  if (params.espece.length > 0)
    query.whereExists(
      db("impact_espece")
        .select(db.raw("1"))
        .whereRaw("dossier = d.id")
        .whereIn("cd_ref", params.espece),
    );
  if (params.actionInstructeur) query.where("d.next_action_expected_from", "Instructeur");
  if (params.action.length > 0) query.whereIn("d.next_action_expected_from", params.action);
  if (params.enjeu) query.where("d.enjeu", true);
  if (params.instructeur.length > 0) {
    const emails = params.instructeur.filter((value) => value !== "sans-instructeur");
    query.where(function () {
      this.whereExists(visibleFollows(db, userId).whereIn("follower.email", emails));
      if (params.instructeur.includes("sans-instructeur")) {
        this.orWhere(function () {
          this.whereNot("access.access", "lecture").whereNotExists(visibleFollows(db, userId));
        });
      }
    });
  }
  if (params.nouveaute === "oui") query.where("notification.viewed", false);
  if (params.nouveaute === "non") query.whereRaw("notification.viewed is distinct from false");
  if (params.decision)
    query.whereExists(
      db("decision_administrative")
        .select(db.raw("1"))
        .whereRaw("dossier = d.id")
        .whereRaw(`strpos(${normalizedSql("number")}, ?) > 0`, [params.decision]),
    );
  if (params.decisionAbsente)
    query.whereNotExists(
      db("decision_administrative")
        .select(db.raw("1"))
        .whereRaw("dossier = d.id")
        .whereNotNull("fichier"),
    );
  if (params.avisManquant)
    query.whereNotExists(
      db("avis_expert")
        .select(db.raw("1"))
        .whereRaw("dossier = d.id")
        .whereIn("expert", [...OFFICIAL_AVIS_EXPERTS])
        .whereNotNull("avis_fichier"),
    );
  if (params.especesAbsente)
    query.whereNotExists(db("impact_espece").select(db.raw("1")).whereRaw("dossier = d.id"));
  filterByDate(query, params);
}

function filterByDate(query: Knex.QueryBuilder, params: ListParams) {
  if (params.dateStart || params.dateEnd) {
    const date =
      params.dateField === "phaseStart"
        ? "case when phase.dossier is not null then phase.timestamp else d.depot_date end"
        : params.dateField === "lastModified"
          ? "notification.updated_at"
          : params.dateField === "nextDue"
            ? "d.next_due_date"
            : "d.depot_date";
    query.whereRaw(`${date} is not null`);
    // Browser date-only next_due_date strings represent UTC midnight in the old filter.
    const timestamp =
      params.dateField === "nextDue" ? `(${date}::timestamp at time zone 'UTC')` : date;
    const start = new Date(`${params.dateStart}T00:00:00Z`);
    const end = new Date(`${params.dateEnd}T23:59:59.999Z`);
    if (params.dateStart && !Number.isNaN(start.getTime()))
      query.whereRaw(`${timestamp} >= (?::timestamp at time zone ?)`, [
        start.toISOString().slice(0, -1),
        params.timeZone,
      ]);
    if (params.dateEnd && !Number.isNaN(end.getTime()))
      query.whereRaw(`${timestamp} <= (?::timestamp at time zone ?)`, [
        end.toISOString().slice(0, -1),
        params.timeZone,
      ]);
  }
}
