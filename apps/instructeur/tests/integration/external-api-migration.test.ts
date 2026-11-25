import { expect, test } from "vitest";
import { down, up } from "../../../../libs/database/migrations/20261123120000_external-api.ts";
import { db } from "../setup/db.ts";

const apiTables = [
  "external_api_client",
  "external_api_dossier_grant",
  "external_api_groupe_grant",
  "external_api_key",
] as const;

test("the API migration rolls back and recreates the complete schema", async () => {
  await db.transaction(async (trx) => {
    await down(trx);
    for (const table of apiTables) expect(await trx.schema.hasTable(table)).toBe(false);

    await up(trx);
    for (const table of apiTables) expect(await trx.schema.hasTable(table)).toBe(true);
    const [client] = await trx("external_api_client")
      .insert({ client_id: "new-service" })
      .returning(["enabled", "allow_oauth"]);
    expect(client).toEqual({ enabled: false, allow_oauth: false });
  });
});
