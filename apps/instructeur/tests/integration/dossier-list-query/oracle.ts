import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossiersListScope } from "@pitchou/types/dossierList.ts";
import { getDossiersSummariesForUser } from "@pitchou/server/database/dossier/summary.ts";
import { getNotificationsForUser } from "@pitchou/server/database/notification.ts";
import { getRelationSuivis } from "@pitchou/server/database/capabilities.ts";
import { filterDossiers } from "../../../src/lib/components/ListDossiers/filtering.ts";
import { readDossiersQuery } from "../../../src/lib/components/ListDossiers/query.ts";
import { sortDossiers } from "../../../src/lib/components/ListDossiers/sorting.ts";
import { groupDossiersByProjet } from "../../../src/lib/components/ListDossiers/projects.ts";

export async function expectedList(
  db: Knex,
  userId: UserId,
  params: URLSearchParams,
  scope: DossiersListScope,
  browserTimeZone?: string,
) {
  const summaries = (await getDossiersSummariesForUser(userId, db)).sort(
    (a, b) => Number(a.id) - Number(b.id),
  );
  const notifications = await getNotificationsForUser(userId, db);
  const follows = await getRelationSuivis(userId, db);
  const followRelations = new Map(
    follows.flatMap((f) =>
      f.personneEmail === null ? [] : [[f.personneEmail, new Set(f.followedDossierIds)] as const],
    ),
  );
  const all =
    scope === "followed"
      ? summaries.filter((d) => followRelations.get("élise@example.org")?.has(d.id))
      : summaries;
  const ctx = {
    notificationByDossier: new Map(notifications.map((n) => [n.dossier, n])),
    followRelations,
    followedOnly: scope === "followed",
    especeByCD_REF: new Map([
      [
        "12345",
        {
          CD_REF: "12345",
          nomsVernaculaires: new Set(["Héron"]),
          nomsScientifiques: new Set(["Ardea cinerea"]),
          classification: "oiseau" as const,
          CD_TYPE_STATUTS: new Set<never>(),
          espèceMinistérielle: undefined,
          espèceCNPN: undefined,
        },
      ],
    ]),
  };
  const query = readDossiersQuery(params);
  const original = process.env.TZ;
  if (browserTimeZone) process.env.TZ = browserTimeZone;
  try {
    const filtered = filterDossiers(all, query, ctx);
    const ordered = sortDossiers(filtered, query, ctx.notificationByDossier);
    return {
      ids: ordered.map((d) => d.id),
      grouped: groupDossiersByProjet(ordered),
      scopeTotal: groupDossiersByProjet(all).length,
    };
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}
