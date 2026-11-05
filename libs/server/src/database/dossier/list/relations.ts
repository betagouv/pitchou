import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";

/** Read-only dossiers expose only the current person's follow relation. */
export function visibleFollows(db: Knex, userId: UserId) {
  return db("edge_personne_follows_dossier as f")
    .join("auth_user as follower", "follower.id", "f.personne")
    .select("f.dossier", "follower.email")
    .whereNotNull("follower.email")
    .whereRaw("f.dossier = d.id")
    .where(function () {
      this.whereNot("access.access", "lecture").orWhere("f.personne", userId);
    });
}

/** Relational counterpart of aggregateNotification, used only for date/read predicates. */
export function notificationDates(db: Knex, userId: UserId) {
  const unread = db("action_dossier as a")
    .select("a.dossier")
    .max("a.created_at as updated_at")
    .select(
      db.raw(
        `bool_or(
      a.data->'notification' = 'true'::jsonb
      and coalesce(a.data->>'notification_field', a.data->>'field', '') <> ''
      and (coalesce(a.data->>'notification_legacy', 'false') <> 'true'
        or coalesce(n.receive_legacy_changes, false))
      and not exists (select 1 from notification_review r where r.action = a.id and r.personne = ?)
    ) as has_changes`,
        [userId],
      ),
    )
    .leftJoin("notification as n", (join) =>
      join.on("n.dossier", "a.dossier").andOnVal("n.personne", userId),
    )
    .whereIn("a.dossier", db("scoped_dossiers").select("id"))
    .where("a.author_petitionnaire", true)
    .whereRaw("a.data->>'notification' = 'true'")
    .groupBy("a.dossier");
  return db("scoped_dossiers as d")
    .leftJoin(unread.as("changes"), "changes.dossier", "d.id")
    .leftJoin("notification as n", (join) =>
      join.on("n.dossier", "d.id").andOnVal("n.personne", userId),
    )
    .leftJoin("notification_arrival as arrival", "arrival.dossier", "d.id")
    .select("d.id", "changes.updated_at")
    .select(
      db.raw(`not (
      (arrival.dossier is not null and not coalesce(n.arrival_viewed, false))
      or (n.follow_revision is not null and n.follow_at is not null)
      or coalesce(changes.has_changes, false)
    ) as viewed`),
    )
    .where(function () {
      this.whereNot("d.access", "lecture").orWhereExists(
        db("edge_personne_follows_dossier as own")
          .select(db.raw("1"))
          .whereRaw("own.dossier = d.id")
          .where("own.personne", userId),
      );
    });
}
