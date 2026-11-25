import type { Knex } from "knex";
import {
  dossierInternalScope,
  dossierReadScope,
  type ApiScope,
} from "@pitchou/types/externalApi.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { ExternalApiIdentity, ExternalApiPrincipal } from "../externalApi.ts";
import { dossierAccessQuery } from "../dossier/access.ts";
import { usableApiKeys } from "./keys.ts";

export function keyWithScope(keyId: string, scope: string, db: Knex) {
  return usableApiKeys(db).select("id").where({ id: keyId }).whereRaw("? = ANY(scopes)", [scope]);
}

export function externalDossiers(identity: ExternalApiIdentity, scope: string, db: Knex) {
  const query = db("dossier");
  if (identity.kind === "personal") {
    query.join(
      dossierAccessQuery(identity.userId, db).as("access"),
      "access.dossier",
      "dossier.id",
    );
  } else {
    query.whereExists(serviceAccessQuery(identity.clientId, scope, !identity.keyId, db));
  }
  if (identity.keyId) query.whereExists(keyWithScope(identity.keyId, scope, db));
  return query;
}

export async function withExternalDossier<T>(
  principal: ExternalApiPrincipal,
  dossierId: DossierId,
  read: (access: DossierAccess, trx: Knex.Transaction) => Promise<T>,
  db: Knex,
) {
  return db.transaction(
    async (trx) => {
      const query = externalDossiers(principal, dossierReadScope, trx).where(
        "dossier.id",
        dossierId,
      );
      if (principal.kind === "personal") {
        const row = await query.first<{ access: DossierAccess }>("access.access");
        return row ? read(row.access, trx) : undefined;
      }
      if (!(await query.first("dossier.id"))) return;
      const internal =
        principal.scopes.has(dossierInternalScope) &&
        (await externalDossiers(principal, dossierInternalScope, trx)
          .where("dossier.id", dossierId)
          .first("dossier.id"));
      return read(internal ? "lecture_complete" : "lecture", trx);
    },
    { readOnly: true, isolationLevel: "repeatable read" },
  );
}

export async function withExternalKey<T>(
  principal: ExternalApiPrincipal,
  scope: ApiScope,
  read: (trx: Knex.Transaction) => Promise<T>,
  db: Knex,
) {
  return db.transaction(
    async (trx) => {
      if (await externalKeyIsUsable(principal, scope, trx)) return read(trx);
    },
    { readOnly: true, isolationLevel: "repeatable read" },
  );
}

export async function externalKeyIsUsable(
  principal: ExternalApiPrincipal,
  scope: ApiScope,
  db: Knex,
) {
  if (principal.keyId) return Boolean(await keyWithScope(principal.keyId, scope, db).first());
  if (principal.kind !== "service") return false;
  const client = await db("external_api_client")
    .where({ client_id: principal.clientId, enabled: true, allow_oauth: true })
    .first("client_id");
  return Boolean(client);
}

function serviceAccessQuery(clientId: string, scope: string, requireOAuth: boolean, db: Knex) {
  const dossierGrant = db("external_api_dossier_grant as grant")
    .select("grant.dossier")
    .where({ "grant.client_id": clientId, "grant.scope": scope })
    .where("grant.dossier", db.ref("dossier.id"));
  const groupeGrant = db("external_api_groupe_grant as grant")
    .join("groupe_instructeurs as groupe", "groupe.id", "grant.groupe_instructeurs")
    .join(
      "edge_groupe_instructeurs__dossier as assignment",
      "assignment.groupe_instructeurs",
      "groupe.id",
    )
    .select("assignment.dossier")
    .where({ "grant.client_id": clientId, "grant.scope": scope, "groupe.active": true })
    .where("assignment.dossier", db.ref("dossier.id"));

  const client = db("external_api_client")
    .select("client_id")
    .where({ client_id: clientId, enabled: true });
  if (requireOAuth) client.where({ allow_oauth: true });
  return client.where((grants) => grants.whereExists(dossierGrant).orWhereExists(groupeGrant));
}
