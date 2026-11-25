import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { up } from "../../../../libs/database/migrations/20261125130000_rename-external-api-scopes.ts";
import {
  accountReadScope,
  dossierInternalScope,
  dossierReadScope,
  referenceReadScope,
  retiredStatusScope,
} from "@pitchou/types/externalApi.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/dossier.ts";
import { db } from "../setup/db.ts";

test("renames persisted permissions and grants without upgrading status-only keys", async () => {
  const clientId = "existing-service";
  const [owner] = await db("auth_user").insert({ email: "existing@example.test" }).returning("id");
  const dossier = await createDossier(db);
  const groupe = await createGroupeInstructeurs(db);
  await db("external_api_client").insert({ client_id: clientId });
  await db("external_api_key").insert([
    {
      user_id: owner.id,
      label: "Personal key",
      scopes: ["compte:read", "referentiels:read", dossierReadScope],
      secret_hash: createHash("sha256").update("personal").digest("hex"),
      expires_at: db.raw("now() + interval '1 day'"),
    },
    {
      client_id: clientId,
      label: "Status-only key",
      scopes: [retiredStatusScope],
      secret_hash: createHash("sha256").update("service").digest("hex"),
      expires_at: db.raw("now() + interval '1 day'"),
    },
  ]);
  await db("external_api_dossier_grant").insert({
    client_id: clientId,
    scope: "dossiers:read:interne",
    dossier: dossier.id,
  });
  await db("external_api_groupe_grant").insert([
    { client_id: clientId, scope: "dossiers:read:interne", groupe_instructeurs: groupe.id },
    { client_id: clientId, scope: dossierInternalScope, groupe_instructeurs: groupe.id },
  ]);

  await db.transaction(up);

  expect(await db("external_api_key").orderBy("label").pluck("scopes")).toEqual([
    [accountReadScope, referenceReadScope, dossierReadScope],
    [retiredStatusScope],
  ]);
  expect(await db("external_api_dossier_grant").pluck("scope")).toEqual([dossierInternalScope]);
  expect(await db("external_api_groupe_grant").pluck("scope")).toEqual([dossierInternalScope]);
});
