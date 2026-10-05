import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { BUNDLES, type Permission, type UserId } from "@pitchou/types/permissions.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

export function permissionQuery(
  userId: UserId,
  permission: Permission,
  db: Knex.Transaction | Knex,
) {
  const bundles = Object.entries(BUNDLES)
    .filter(([, values]) => (values as Permission[]).includes(permission))
    .map(([key]) => key);
  return db("auth_user as u")
    .select("u.id")
    .where({ "u.id": userId, "u.active": true })
    .where(function () {
      this.whereExists(
        db("auth_permission").select("user_id").where({ user_id: userId, permission }),
      ).orWhereExists(
        db("auth_permission_bundle")
          .select("user_id")
          .where({ user_id: userId })
          .whereIn("bundle", bundles),
      );
    })
    .whereNotExists(
      db("auth_permission_exclusion").select("user_id").where({ user_id: userId, permission }),
    );
}

export function dossierAccessQuery(userId: UserId, db: Knex.Transaction | Knex) {
  const membership = db("user_groupe as m")
    .join("groupe_instructeurs as g", "g.id", "m.groupe_instructeurs")
    .select("m.groupe_instructeurs")
    .where({ "m.user_id": userId, "g.active": true });
  const ownership = db("edge_groupe_instructeurs__dossier as e")
    .select("e.dossier")
    .where("e.dossier", db.ref("dossier.id"))
    .whereIn("e.groupe_instructeurs", membership.clone());
  return db("dossier")
    .select("dossier.id as dossier")
    .select(
      db.raw("case when exists (?) and exists (?) then 'complet' else 'lecture' end as access", [
        ownership,
        permissionQuery(userId, "dossier:instruct", db),
      ]),
    )
    .whereExists(permissionQuery(userId, "dossier:read", db))
    .whereExists(membership);
}

export async function dossiersAccessibleToUser(
  dossierIds: Dossier["id"] | Dossier["id"][],
  userId: UserId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Map<Dossier["id"], DossierAccess>> {
  const rows = await dossierAccessQuery(userId, db).whereIn(
    "dossier.id",
    Array.isArray(dossierIds) ? dossierIds : [dossierIds],
  );
  return new Map(
    rows.map(({ dossier, access }: { dossier: Dossier["id"]; access: DossierAccess }) => [
      dossier,
      access,
    ]),
  );
}

function meaningfulEvents(query: Knex.QueryBuilder) {
  return query.andWhere(function () {
    this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
  });
}

export async function getLatestEvenementsPhaseDossiers(
  userId: UserId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return meaningfulEvents(db("evenement_phase_dossier").select("dossier", "phase", "timestamp"))
    .whereIn("dossier", dossierAccessQuery(userId, db).clearSelect().select("dossier.id"))
    .distinctOn("dossier")
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "timestamp", order: "desc" },
    ]);
}

export async function getEvenementsPhaseDossiers(
  userId: UserId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return meaningfulEvents(db("evenement_phase_dossier").select("evenement_phase_dossier.*"))
    .join(
      dossierAccessQuery(userId, db).as("access"),
      "access.dossier",
      "evenement_phase_dossier.dossier",
    )
    .where("access.access", "complet");
}

export async function getEvenementsPhaseDossier(
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex,
): Promise<EvenementPhaseDossier[]> {
  return meaningfulEvents(
    db("evenement_phase_dossier").select("*").where({ dossier: dossierId }),
  ).orderBy("timestamp", "desc");
}
