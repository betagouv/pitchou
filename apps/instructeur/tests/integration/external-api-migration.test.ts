import { expect, test } from "vitest";
import { down, up } from "../../../../libs/database/migrations/20261123120000_external-api.ts";
import {
  down as removeAllDossiersGrants,
  up as addAllDossiersGrants,
} from "../../../../libs/database/migrations/20261126140000_external-api-all-dossiers.ts";
import { db } from "../setup/db.ts";

const apiTables = [
  "external_api_client",
  "external_api_dossier_grant",
  "external_api_groupe_grant",
  "external_api_all_dossiers_grant",
  "external_api_key",
] as const;

test("the API migration rolls back and recreates the complete schema", async () => {
  await db.transaction(async (trx) => {
    await removeAllDossiersGrants(trx);
    await down(trx);
    for (const table of apiTables) expect(await trx.schema.hasTable(table)).toBe(false);

    await up(trx);
    const clientId = "new-service";
    await trx("external_api_client").insert({ client_id: clientId });
    await addAllDossiersGrants(trx);
    for (const table of apiTables) expect(await trx.schema.hasTable(table)).toBe(true);
    const client = await trx("external_api_client")
      .where({ client_id: clientId })
      .first("enabled", "allow_oauth");
    expect(client).toEqual({ enabled: false, allow_oauth: false });
    expect(await trx("external_api_all_dossiers_grant").select()).toEqual([]);
  });
});
