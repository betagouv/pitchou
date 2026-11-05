import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { BUNDLES, type Permission, type UserId } from "@pitchou/types/permissions.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import { orderPhaseEvents } from "../phaseHistory.ts";

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
  const groupGrants = db("edge_groupe_instructeurs__dossier as e")
    .select("e.dossier", "e.access_level")
    .whereIn("e.groupe_instructeurs", membership.clone());
  const directGrants = db("dossier_user_access as direct")
    .select("direct.dossier", "access_level")
    .where("user_id", userId);
  const assignedGrants = db(db.unionAll([groupGrants, directGrants], true).as("grants"))
    .select("dossier")
    .select(db.raw("bool_or(access_level = 'instruct') as instruction"))
    .groupBy("dossier");
  // Collapse duplicate grants before sharing them with every demande in the project.
  // The left joins also retain dossiers that do not belong to a project.
  const sharedDossier = "coalesce(sibling.dossier, assigned.dossier)";
  const grants = db(assignedGrants.as("assigned"))
    .leftJoin("dossier_demande as member", "member.dossier", "assigned.dossier")
    .leftJoin("dossier_demande as sibling", "sibling.projet", "member.projet")
    .select(db.raw(`${sharedDossier} as dossier`))
    .select(db.raw("bool_or(assigned.instruction) as instruction"))
    .groupByRaw(sharedDossier);
  // Keep batch reads relational so account and membership checks are shared
  // across the dossier listing instead of repeated for every row.
  return db("dossier")
    .leftJoin(grants.as("dossier_grant"), "dossier_grant.dossier", "dossier.id")
    .select("dossier.id as dossier")
    .select(
      db.raw(
        `case when dossier_grant.instruction and exists (?) then 'complet'
        when dossier_grant.dossier is not null then 'lecture_complete' else 'lecture' end as access`,
        [permissionQuery(userId, "dossier:instruct", db)],
      ),
    )
    .whereExists(permissionQuery(userId, "dossier:read", db))
    .where(function () {
      this.whereExists(membership).orWhereNotNull("dossier_grant.dossier");
    });
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

export async function getLatestEvenementsPhaseDossiers(
  userId: UserId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
  dossierIds?: Dossier["id"][],
): Promise<EvenementPhaseDossier[]> {
  return db("evenement_phase_dossier")
    .select("dossier", "phase", "timestamp", "recorded_at")
    .whereIn("dossier", dossierAccessQuery(userId, db).clearSelect().select("dossier.id"))
    .modify((query) => {
      if (dossierIds) query.whereIn("dossier", dossierIds);
    })
    .distinctOn("dossier")
    .orderBy("dossier", "asc")
    .modify(orderPhaseEvents);
}

export async function getEvenementsPhaseDossiers(
  userId: UserId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return db("evenement_phase_dossier")
    .select("evenement_phase_dossier.*")
    .join(
      dossierAccessQuery(userId, db).as("access"),
      "access.dossier",
      "evenement_phase_dossier.dossier",
    )
    .whereNot("access.access", "lecture")
    .modify(orderPhaseEvents);
}

export async function getEvenementsPhaseDossier(
  dossierId: Dossier["id"],
  db: Knex.Transaction | Knex,
): Promise<EvenementPhaseDossier[]> {
  return db("evenement_phase_dossier")
    .select("*")
    .where({ dossier: dossierId })
    .modify(orderPhaseEvents);
}
