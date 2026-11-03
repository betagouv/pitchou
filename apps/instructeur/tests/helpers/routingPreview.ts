import type { PreviewCategory } from "@pitchou/types/groupRouting.ts";
import { db } from "../setup/db.ts";
import { fetchAuthenticated } from "./auth.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";

export const postPreview = (token: string, input: object, query = "") =>
  fetchAuthenticated(token, `${ADMIN_BASE_URL}/api/groupes-instructeurs/apercu${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

export const pageQuery = (token: string, category: PreviewCategory, page: number) =>
  `?category=${category}&page=${page}&token=${token}`;

export const previewRule = (department: string, accessLevel = "instruct") => ({
  departments: [department],
  communes: [],
  activites: [],
  accessLevel,
});

export const previewState = () =>
  Promise.all(
    [
      "groupe_instructeurs",
      "groupe_departement",
      "group_routing_rule",
      "user_groupe",
      "dossier_group_override",
      "edge_groupe_instructeurs__dossier",
      "administration_event",
      "email_notification_outbox",
      "email_notification_groupe_arrival",
      "edge_personne_follows_dossier",
    ].map((table) => db(table).select("*")),
  );
