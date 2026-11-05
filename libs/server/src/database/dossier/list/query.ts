import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossiersListScope } from "@pitchou/types/dossierList.ts";
import { dossierAccessQuery } from "../access.ts";
import { orderPhaseEvents } from "../../phaseHistory.ts";
import { notificationDates } from "./relations.ts";
import { applyFilters } from "./filters.ts";
import { applySearch } from "./search.ts";
import type { ListParams } from "./params.ts";

export function scopedQuery(db: Knex, userId: UserId, scope: DossiersListScope) {
  const scoped = db("dossier as d")
    .join("accessible_dossiers as access", "access.dossier", "d.id")
    .leftJoin("dossier_demande as member", "member.dossier", "d.id")
    .select("d.id", "access.access")
    .select(db.raw("coalesce(member.projet::text, 'd:' || d.id::text) as group_key"));
  if (scope === "followed")
    scoped.whereExists(
      db("edge_personne_follows_dossier as own")
        .select(db.raw("1"))
        .whereRaw("own.dossier = d.id")
        .where("own.personne", userId),
    );
  return db
    .withMaterialized("accessible_dossiers", dossierAccessQuery(userId, db))
    .withMaterialized("scoped_dossiers", scoped);
}

/** Every filter runs before the window groups the matching demandes. */
export function filteredQuery(
  db: Knex,
  userId: UserId,
  params: ListParams,
  scope: DossiersListScope,
) {
  const root = scopedQuery(db, userId, scope);
  const needsNotification =
    params.sort === "lastModified" ||
    params.dateField === "lastModified" ||
    params.nouveaute === "oui" ||
    params.nouveaute === "non";
  const needsPhase = params.phase.length > 0 || params.dateField === "phaseStart";
  if (needsNotification) root.withMaterialized("notification_dates", notificationDates(db, userId));
  if (needsPhase)
    root.withMaterialized(
      "latest_phase",
      db("evenement_phase_dossier")
        .distinctOn("dossier")
        .select("dossier", "phase", "timestamp")
        .whereIn("dossier", db("scoped_dossiers").select("id"))
        .orderBy("dossier")
        .modify(orderPhaseEvents),
    );
  const filtered = db("dossier as d")
    .join("scoped_dossiers as access", "access.id", "d.id")
    .leftJoin("dossier_demande as member", "member.dossier", "d.id")
    .leftJoin("activite_label", (join) =>
      join
        .on("activite_label.label", "d.main_activite")
        .andOnVal("activite_label.needs_review", false),
    )
    .leftJoin("activite", "activite.code", "activite_label.activite_code")
    .select("d.id", "access.group_key");
  if (needsNotification)
    filtered.leftJoin("notification_dates as notification", "notification.id", "d.id");
  if (needsPhase) filtered.leftJoin("latest_phase as phase", "phase.dossier", "d.id");
  if (scope !== "followed" && !params.france) filtered.whereNot("access.access", "lecture");
  const sortColumn =
    params.sort === "lastModified"
      ? "notification.updated_at"
      : params.sort === "nextDueDate"
        ? "d.next_due_date"
        : "d.depot_date";
  filtered.select(db.ref(sortColumn).as("sort_date"));
  applyFilters(filtered, db, userId, params);
  const searched = applySearch(filtered, root, db, userId, params.terms);
  return root.withMaterialized("filtered_demandes", searched);
}

export function pageQuery(db: Knex, userId: UserId, params: ListParams, scope: DossiersListScope) {
  const order = `sort_date ${params.order} nulls last, id asc`;
  const ranked = db("filtered_demandes")
    .select("*")
    .select(
      db.raw(`
    row_number() over (partition by group_key order by ${order}) as position,
    count(*) over (partition by group_key) as matching_count`),
    );
  return filteredQuery(db, userId, params, scope)
    .with("ranked_demandes", ranked)
    .with(
      "counts",
      db.select(
        db.raw(`
      (select count(*) from ranked_demandes where position = 1)::integer as total,
      (select count(*) from filtered_demandes)::integer as "totalDemandes",
      (select count(distinct group_key) from scoped_dossiers)::integer as "scopeTotal"`),
      ),
    )
    .from("counts")
    .select("counts.*")
    .select(
      db.raw(`least(?, greatest(1, ceil(total::numeric / ?)))::integer as page`, [
        params.page,
        params.pageSize,
      ]),
    )
    .select(
      db.raw(
        `(select coalesce(jsonb_agg(to_jsonb(selected) order by ${order}), '[]'::jsonb)
      from (select id, matching_count, sort_date from ranked_demandes where position = 1
        order by ${order} limit ? offset
          ((least(?, greatest(1, ceil(counts.total::numeric / ?))) - 1) * ?)) selected) as items`,
        [params.pageSize, params.page, params.pageSize, params.pageSize],
      ),
    );
}
