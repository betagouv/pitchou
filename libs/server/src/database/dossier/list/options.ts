import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossiersListOptions, DossiersListScope } from "@pitchou/types/dossierList.ts";
import { scopedQuery } from "./query.ts";

export async function loadOptions(
  db: Knex,
  userId: UserId,
  scope: DossiersListScope,
): Promise<DossiersListOptions> {
  const activites: DossiersListOptions["activites"] = await scopedQuery(db, userId, scope)
    .from("scoped_dossiers as access")
    .join("dossier as d", "d.id", "access.id")
    .leftJoin("activite_label as label", (join) =>
      join.on("label.label", "d.main_activite").andOnVal("label.needs_review", false),
    )
    .leftJoin("activite as a", "a.code", "label.activite_code")
    .distinct(db.raw("coalesce(a.code, 'autre') as code"))
    .select(
      db.raw(
        "case when coalesce(a.code, 'autre') = 'autre' then 'Autre' else coalesce(a.label, a.code) end as label",
      ),
    )
    .where(function () {
      this.whereNotNull("a.code").orWhereRaw("nullif(d.main_activite, '') is not null");
    });
  const departments: { code: string }[] = await scopedQuery(db, userId, scope)
    .from("scoped_dossiers as access")
    .join("dossier as d", "d.id", "access.id")
    .distinct(db.raw("json_array_elements_text(d.departments) as code"))
    .whereNot("access.access", "lecture");
  const followers: { email: string }[] = await scopedQuery(db, userId, scope)
    .from("scoped_dossiers as access")
    .join("edge_personne_follows_dossier as f", "f.dossier", "access.id")
    .join("auth_user as u", "u.id", "f.personne")
    .distinct("u.email")
    .whereNotNull("u.email")
    .where(function () {
      this.whereNot("access.access", "lecture").orWhere("f.personne", userId);
    });
  return {
    activites: activites.sort((a, b) =>
      a.code === "autre" ? 1 : b.code === "autre" ? -1 : a.label.localeCompare(b.label, "fr"),
    ),
    assignedDepartments: departments
      .map(({ code }) => code)
      .sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    instructeurs: followers.map(({ email }) => email).sort((a, b) => a.localeCompare(b, "fr")),
  };
}
