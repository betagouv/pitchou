import type { Knex } from "knex";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_ENVIRONMENTS,
  type NotificationFilters,
} from "@pitchou/types/emailNotifications.ts";

export function notificationFilters(params: URLSearchParams): NotificationFilters {
  const choice = (key: string, allowed: readonly string[], fallback = "") => {
    const value = params.get(key) || fallback;
    if (value && !allowed.includes(value)) throw new RangeError(`Filtre invalide : ${key}`);
    return value;
  };
  const date = (key: string) => {
    const value = params.get(key) ?? "";
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
        value.startsWith("0000-") ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new RangeError(`Date invalide : ${key}`);
    return value;
  };
  const page = Number(params.get("page") || "1");
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new RangeError("Page invalide");
  const notification = params.get("notification") || "";
  if (
    notification &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(notification)
  )
    throw new RangeError("Identifiant de notification invalide");
  const dateFrom = date("from"),
    dateTo = date("to");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new RangeError("Période invalide");
  return {
    search: (params.get("search") || "").trim().slice(0, 200),
    kind: choice("kind", NOTIFICATION_KINDS),
    status: choice("status", NOTIFICATION_STATUSES),
    environment: choice("environment", NOTIFICATION_ENVIRONMENTS),
    dateFrom,
    dateTo,
    dateField: choice(
      "dateField",
      ["due_at", "sent_at", "created_at"],
      "due_at",
    ) as NotificationFilters["dateField"],
    overdue: choice("overdue", ["1"]) === "1",
    page,
    notification,
  };
}

export function notificationQuery(filters: NotificationFilters, db: Knex.Transaction) {
  const base = db("email_notification_outbox as n")
    .leftJoin("dossier as d", "d.id", "n.dossier")
    .leftJoin("auth_user as p", "p.id", "n.personne");
  if (filters.kind) base.where("n.kind", filters.kind);
  if (filters.status) base.where("n.status", filters.status);
  if (filters.environment) base.where("n.environment", filters.environment);
  const column = `n.${filters.dateField}`;
  if (filters.dateFrom)
    base.whereRaw("?? >= (?::date::timestamp AT TIME ZONE 'Europe/Paris')", [
      column,
      filters.dateFrom,
    ]);
  if (filters.dateTo)
    base.whereRaw("?? < ((?::date + 1)::timestamp AT TIME ZONE 'Europe/Paris')", [
      column,
      filters.dateTo,
    ]);
  if (filters.overdue) base.where("n.status", "pending").where("n.due_at", "<", db.fn.now());
  if (filters.search) {
    const pattern = `%${filters.search.replaceAll(/[\\%_]/gu, "\\$&")}%`;
    base.where((q) => {
      for (const field of [
        "n.id",
        "n.dossier",
        "n.personne",
        "d.name",
        "p.email",
        "p.first_names",
        "p.last_name",
      ])
        q.orWhereRaw("??::text ILIKE ? ESCAPE '\\'", [field, pattern]);
    });
  }
  return base;
}
