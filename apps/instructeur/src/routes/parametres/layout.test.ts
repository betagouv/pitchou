import { beforeEach, expect, test, vi } from "vitest";
import { load } from "./+layout.ts";
import { store } from "#lib/state/store.svelte.ts";

vi.mock("#lib/state/store.svelte.ts", () => ({ store: { capabilities: {} } }));
beforeEach(() => {
  store.capabilities = {};
});
test("waits for application initialization before checking settings access", async () => {
  const parent = vi.fn(async () => {
    store.capabilities.getEmailNotificationPreferences = vi.fn();
  });
  await expect(load({ parent } as never)).resolves.toEqual({});
  expect(parent).toHaveBeenCalledOnce();
});
test("redirects anonymous visitors for every settings section", async () => {
  await expect(load({ parent: async () => ({}) } as never)).rejects.toMatchObject({
    status: 307,
    location: "/connexion",
  });
});
