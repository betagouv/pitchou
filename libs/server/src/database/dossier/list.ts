import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type {
  DossiersListOptions,
  DossiersListPage,
  DossiersListScope,
} from "@pitchou/types/dossierList.ts";
import { directDatabaseConnection } from "../../database.ts";
import { getNotificationsForUser } from "../notification.ts";
import { getDossiersSummariesForUser } from "./summary.ts";
import { readParams } from "./list/params.ts";
import { filteredQuery, pageQuery, scopedQuery } from "./list/query.ts";
import { loadOptions } from "./list/options.ts";

function readSnapshot<T>(
  db: Knex,
  read: (trx: Knex.Transaction) => Promise<T>,
  searching = false,
): Promise<T> {
  return db.isTransaction
    ? read(db as Knex.Transaction)
    : db.transaction(
        async (trx) => {
          // Interactive searches finish sooner without compiling hundreds of JIT expressions.
          // Keep this setting inside our own transaction; never alter a caller's transaction.
          if (searching) await trx.raw("set local jit = off");
          return read(trx);
        },
        { readOnly: true, isolationLevel: "repeatable read" },
      );
}

export async function getDossiersListPage(
  userId: UserId,
  params: URLSearchParams,
  scope: DossiersListScope,
  db: Knex = directDatabaseConnection,
): Promise<DossiersListPage> {
  const query = readParams(params);
  return readSnapshot(
    db,
    async (trx) => {
      const [result] = (await pageQuery(trx, userId, query, scope)) as {
        total: number;
        totalDemandes: number;
        scopeTotal: number;
        page: number;
        items: { id: DossierId; matching_count: number }[];
      }[];
      const ids = result.items.map(({ id }) => id);
      const summaries = await getDossiersSummariesForUser(userId, trx, ids);
      const byId = new Map(summaries.map((item) => [item.id, item]));
      const items = result.items.map(({ id, matching_count }) => {
        const item = byId.get(id)!;
        if (item.projet) {
          item.name = item.projet.name;
          item.projet.matchingCount = Number(matching_count);
        }
        return item;
      });
      const followRelations: DossiersListPage["followRelations"] = [];
      let notifications: DossiersListPage["notifications"] = [];
      if (ids.length > 0) {
        const followers: { dossier: DossierId; email: string }[] = await scopedQuery(
          trx,
          userId,
          scope,
        )
          .from("scoped_dossiers as access")
          .join("edge_personne_follows_dossier as f", "f.dossier", "access.id")
          .join("auth_user as u", "u.id", "f.personne")
          .select("f.dossier", "u.email")
          .whereNotNull("u.email")
          .whereIn("access.id", ids)
          .where(function () {
            this.whereNot("access.access", "lecture").orWhere("f.personne", userId);
          });
        const byEmail = Map.groupBy(followers, ({ email }) => email);
        for (const [email, follows] of byEmail)
          followRelations.push([email, follows.map(({ dossier }) => dossier)]);
        notifications = await getNotificationsForUser(userId, trx, ids);
      }
      return { ...result, items, pageSize: query.pageSize, followRelations, notifications };
    },
    query.terms.length > 0,
  );
}

export function getDossiersListOptions(
  userId: UserId,
  scope: DossiersListScope,
  db: Knex = directDatabaseConnection,
): Promise<DossiersListOptions> {
  return readSnapshot(db, (trx) => loadOptions(trx, userId, scope));
}

/** Exports use every filtered demande, including all matching siblings of a project. */
export async function getDossiersListIds(
  userId: UserId,
  params: URLSearchParams,
  scope: DossiersListScope,
  db: Knex = directDatabaseConnection,
): Promise<DossierId[]> {
  const query = readParams(params);
  const rows: { id: DossierId }[] = await readSnapshot(
    db,
    (trx) =>
      filteredQuery(trx, userId, query, scope)
        .from("filtered_demandes")
        .select("id")
        .orderBy("sort_date", query.order, "last")
        .orderBy("id"),
    query.terms.length > 0,
  );
  return rows.map(({ id }) => id);
}
