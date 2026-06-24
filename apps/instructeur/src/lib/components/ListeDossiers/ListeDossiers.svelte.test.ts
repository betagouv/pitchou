import { expect, test, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";

// The container reaches SvelteKit navigation; stub it and spy on the real analytics dispatch.
const { goto, envoyer } = vi.hoisted(() => ({ goto: vi.fn(), envoyer: vi.fn() }));

vi.mock("$app/navigation", () => ({ goto }));
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/mes-dossiers") } }));
vi.mock("$lib/shared/aarri.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/shared/aarri.ts")>()),
  envoyerÉvènementRechercherUnDossier: envoyer,
}));

import ListeDossiers from "./ListeDossiers.svelte";

beforeEach(() => {
  goto.mockClear();
  envoyer.mockClear();
});

function renderList() {
  // dossiers: [] keeps the CarteDossier subtree out of the render
  const result = render(ListeDossiers, {
    titre: "Mes dossiers",
    email: "jane@doe.fr",
    dossiers: [],
    notificationParDossier: new Map(),
  });
  const input = result.container.querySelector("#search-input") as HTMLInputElement;
  return { ...result, input };
}

test("typing alone does not dispatch the analytics event", async () => {
  const { input } = renderList();

  await fireEvent.input(input, { target: { value: "photovoltaïque" } });

  expect(envoyer).not.toHaveBeenCalled();
});

test("committing a search dispatches the analytics event with the searched text", async () => {
  const { input } = renderList();

  await fireEvent.input(input, { target: { value: "photovoltaïque" } });
  await fireEvent.change(input, { target: { value: "photovoltaïque" } });

  expect(envoyer).toHaveBeenCalledTimes(1);
  expect(envoyer.mock.calls[0][0]).toMatchObject({ filtres: { texte: "photovoltaïque" } });
});
