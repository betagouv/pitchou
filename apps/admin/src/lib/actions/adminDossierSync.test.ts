import { afterEach, expect, test, vi } from "vitest";
import { simulateDossierSpecies, simulateDossierSync } from "./adminDossierSync.ts";

afterEach(() => vi.unstubAllGlobals());

test.each(["P-4-2", null])(
  "species simulation submits the selected group %s",
  async (impactType) => {
    const result = { changed: true, message: "Une quantité modifiée.", actions: [] };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetch);
    expect(await simulateDossierSpecies(123, impactType)).toEqual(result);
    expect(fetch).toHaveBeenCalledWith("/api/dossiers/123/simuler-synchronisation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "especes", impactType }),
    });
  },
);

test("scalar simulations keep their existing request contract", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ changed: true, actions: [] })));
  vi.stubGlobal("fetch", fetch);
  await simulateDossierSync(123, "description", "Texte modifié");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    champ: "description",
    valeur: "Texte modifié",
  });
});

test("server errors are not reported as successful species changes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("Groupe introuvable", { status: 400 })),
  );
  await expect(simulateDossierSpecies(123, "P-1")).rejects.toThrow();
});
