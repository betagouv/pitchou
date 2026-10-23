import { notificationFilters } from "../notification_monitoring/filters.ts";
import type { EmailFilters } from "@pitchou/types/adminEmails.ts";

export function emailFilters(params: URLSearchParams): EmailFilters {
  const choice = (key: string, allowed: readonly string[], fallback = "") => {
    const value = params.get(key) || fallback;
    if (value && !allowed.includes(value)) throw new RangeError(`Filtre invalide : ${key}`);
    return value;
  };
  const common = new URLSearchParams(params);
  if (common.get("kind") === "cnpn") common.delete("kind");
  if (common.get("status") === "failed") common.delete("status");
  if (common.get("environment") === "unrecorded") common.delete("environment");
  common.delete("notification");
  const { notification: _notification, ...base } = notificationFilters(common);
  const email = params.get("email") || "";
  if (email && !/^(notification|cnpn):[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(email))
    throw new RangeError("Identifiant de mail invalide");
  return {
    ...base,
    kind: params.get("kind") || "",
    status: params.get("status") || "",
    environment: params.get("environment") || "",
    source: choice("source", ["notification", "cnpn"]),
    tracking: choice("tracking", ["received", "opened", "unconfirmed"]),
    sort: choice(
      "sort",
      ["due_at", "sent_at", "created_at", "dossier", "email"],
      "due_at",
    ) as EmailFilters["sort"],
    order: choice("order", ["asc", "desc"], "desc") as EmailFilters["order"],
    email,
  };
}
