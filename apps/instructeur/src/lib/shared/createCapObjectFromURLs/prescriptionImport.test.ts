import { afterEach, expect, test, vi } from "vitest";
import createCapabilities from "../createCapObjectFromURLs.ts";

const urls = {
  addPrescriptionsAndControles: "/prescriptions-et-controles?cap=test-cap",
} as Parameters<typeof createCapabilities>[0];

afterEach(() => vi.unstubAllGlobals());

test("prescription import preserves the server's rejection message", async () => {
  const message = "Erreur lors de l'ajout/modification de prescription. Invalid numeric value.";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ message }), { status: 400 })),
  );

  await expect(createCapabilities(urls).addPrescriptionsAndControles!([])).rejects.toMatchObject({
    status: 400,
    message,
  });
});

test("prescription import accepts the server's empty success response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

  await expect(createCapabilities(urls).addPrescriptionsAndControles!([])).resolves.toBeUndefined();
});
