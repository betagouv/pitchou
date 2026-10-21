import type { Handle } from "@sveltejs/kit/hooks";
import { afterEach, expect, test, vi } from "vitest";
import { setupSecretGeoMCE } from "@pitchou/server/database/capability_geomce.ts";

vi.mock("@pitchou/server/database/capability_geomce.ts", () => ({
  setupSecretGeoMCE: vi.fn(),
}));
vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (_sentry: Handle, logger: Handle) => logger,
}));
vi.mock("@sentry/sveltekit", () => ({
  sentryHandle: vi.fn(),
  handleErrorWithSentry: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.resetModules();
});

test("starts GeoMCE in init without waiting, and logs a background failure", async () => {
  vi.stubEnv("PUBLIC_SITE_URL_PITCHOU", "http://localhost");
  const pending = Promise.withResolvers<void>();
  vi.mocked(setupSecretGeoMCE).mockReturnValue(pending.promise);
  const logError = vi.spyOn(console, "error").mockImplementation(() => {});

  const { init } = await import("./hooks.server.ts");
  expect(setupSecretGeoMCE).not.toHaveBeenCalled();
  expect(init()).toBeUndefined();
  expect(setupSecretGeoMCE).toHaveBeenCalledOnce();

  const error = new Error("Database unavailable");
  pending.reject(error);
  await vi.waitFor(() => expect(logError).toHaveBeenCalledWith("setupSecretGeoMCE failed:", error));
});
