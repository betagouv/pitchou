import { expect, test } from "vitest";
import { load } from "./+layout.server.ts";

test("settings require a session, but do not require dossier access", async () => {
  const url = new URL("https://pitchou.test/parametres/notifications");
  expect(await load({ locals: { user: { id: 12 } }, url } as never)).toEqual({ userId: 12 });
  await expect(async () => load({ locals: { user: null }, url } as never)).rejects.toMatchObject({
    status: 303,
    location: "/auth/login?redirectTo=%2Fparametres%2Fnotifications",
  });
});
