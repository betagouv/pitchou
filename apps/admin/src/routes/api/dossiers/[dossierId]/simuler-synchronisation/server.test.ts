import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { POST } from "./+server.ts";
import { simulateSpeciesChange } from "$lib/server/simulateSpecies.ts";
import { getDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";

vi.mock("$lib/server/simulateSpecies.ts", () => ({ simulateSpeciesChange: vi.fn() }));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: vi.fn() }));
vi.mock("@pitchou/server/database/dossier.ts", () => ({ dumpDossiers: vi.fn() }));
vi.mock("@pitchou/server/database/action_dossier.ts", () => ({ getDossierActions: vi.fn() }));
vi.mock("@pitchou/server/database/notification.ts", () => ({
  markDossiersUnreadForFollowers: vi.fn(),
}));

beforeEach(() => vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function event(body: unknown, dossierId = "42") {
  return {
    params: { dossierId },
    request: new Request("http://localhost/api/dossiers/42/simuler-synchronisation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as Parameters<typeof POST>[0];
}

test("disabled simulation returns 404 before parsing the id or reading the body", async () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "production");
  const requestEvent = event({ type: "especes", impactType: "P-4-2" }, "invalid");
  const read = vi.spyOn(requestEvent.request, "json");
  await expect(POST(requestEvent)).rejects.toMatchObject({ status: 404 });
  expect(read).not.toHaveBeenCalled();
  expect(simulateSpeciesChange).not.toHaveBeenCalled();
  expect(directDatabaseConnection).not.toHaveBeenCalled();
  expect(getDossierActions).not.toHaveBeenCalled();
  read.mockRestore();
});

test.each(["P-4-2", null])(
  "staging forwards species group %s and returns ten latest actions",
  async (impactType) => {
    vi.stubEnv("NODE_ENV", "production");
    const result = { changed: true, message: "Quantity changed" };
    vi.mocked(simulateSpeciesChange).mockResolvedValue(result);
    const actions = Array.from({ length: 12 }, (_, index) => ({ id: String(index) }));
    vi.mocked(getDossierActions).mockResolvedValue(
      actions as Awaited<ReturnType<typeof getDossierActions>>,
    );
    const response = await POST(event({ type: "especes", impactType }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...result, actions: actions.slice(0, 10) });
    expect(simulateSpeciesChange).toHaveBeenCalledExactlyOnceWith(42, impactType);
    expect(getDossierActions).toHaveBeenCalledExactlyOnceWith(42);
    expect(directDatabaseConnection).not.toHaveBeenCalled();
  },
);

test.each([
  { type: "especes" },
  { type: "especes", impactType: "" },
  { type: "especes", impactType: "  " },
  { type: "especes", impactType: 42 },
  { type: "especes", impactType: [] },
  { type: "especes", impactType: null, champ: "name" },
  null,
  [],
])("rejects invalid species body %j without calling services", async (body) => {
  await expect(POST(event(body))).rejects.toMatchObject({ status: 400 });
  expect(simulateSpeciesChange).not.toHaveBeenCalled();
  expect(directDatabaseConnection).not.toHaveBeenCalled();
  expect(getDossierActions).not.toHaveBeenCalled();
});

test("propagates the helper's missing-dossier 404 without loading actions", async () => {
  const { error } = await import("@sveltejs/kit");
  vi.mocked(simulateSpeciesChange).mockImplementation(async () =>
    error(404, "Dossier introuvable."),
  );
  await expect(POST(event({ type: "especes", impactType: null }))).rejects.toMatchObject({
    status: 404,
  });
  expect(getDossierActions).not.toHaveBeenCalled();
});
