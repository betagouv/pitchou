import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import type { ApiGrant, ApiGrantTarget, ApiScope } from "@pitchou/types/externalApi.ts";
import { directDatabaseConnection } from "../connection.ts";
import { listServiceApiKeys } from "./keys.ts";

type Integration = { id: string; name: string; enabled: boolean; allowOAuth: boolean };

export async function listApiIntegrations(db: Knex = directDatabaseConnection) {
  const [clients, keys, dossiers, groupes, activeGroupes] = await Promise.all([
    db("external_api_client")
      .select<Integration[]>(
        "client_id as id",
        db.raw("coalesce(name, client_id) as name"),
        "enabled",
        "allow_oauth as allowOAuth",
      )
      .orderBy("name"),
    listServiceApiKeys(db),
    db("external_api_dossier_grant as grant")
      .join("dossier", "dossier.id", "grant.dossier")
      .select<(ApiGrant & { clientId: string })[]>(
        "grant.client_id as clientId",
        "grant.scope",
        "dossier.id as dossierId",
        db.raw(
          "concat('#', dossier.id, ' – ', coalesce(dossier.name, 'Dossier sans nom')) as label",
        ),
      )
      .orderBy("dossier.id"),
    db("external_api_groupe_grant as grant")
      .join("groupe_instructeurs as groupe", "groupe.id", "grant.groupe_instructeurs")
      .select<(ApiGrant & { clientId: string })[]>(
        "grant.client_id as clientId",
        "grant.scope",
        "groupe.id as groupeId",
        "groupe.name as label",
      )
      .orderBy("groupe.name"),
    db("groupe_instructeurs")
      .where({ active: true })
      .select<{ id: string; name: string }[]>("id", "name")
      .orderBy("name"),
  ]);
  const grants = [...dossiers, ...groupes];
  return {
    integrations: clients.map((client) => ({
      ...client,
      keys: keys.filter(({ clientId }) => clientId === client.id),
      grants: grants.filter(({ clientId }) => clientId === client.id),
    })),
    groupes: activeGroupes,
  };
}

export async function createApiIntegration(name: string, db: Knex) {
  const id = `service-${randomUUID()}`;
  await db("external_api_client").insert({
    client_id: id,
    name,
    enabled: true,
    allow_oauth: false,
  });
  return id;
}

export function apiIntegration(clientId: string, db: Knex) {
  return db("external_api_client").where({ client_id: clientId });
}

export function changeApiIntegrationGrant(
  clientId: string,
  scope: ApiScope,
  target: ApiGrantTarget,
  add: boolean,
  db: Knex,
) {
  const values = {
    client_id: clientId,
    scope,
    ...("dossierId" in target
      ? { dossier: target.dossierId }
      : { groupe_instructeurs: target.groupeId }),
  };
  const grants = db(
    "dossierId" in target ? "external_api_dossier_grant" : "external_api_groupe_grant",
  );
  return add ? grants.insert(values).onConflict().ignore() : grants.where(values).del();
}
