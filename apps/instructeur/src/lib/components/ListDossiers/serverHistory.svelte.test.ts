import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/tous-les-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendEvenement: vi.fn(),
  sendDossierSearchEvent: vi.fn(),
}));
import { page as route } from "$app/state";
import { goto } from "$app/navigation";
import TousPage from "../../../routes/tous-les-dossiers/+page.svelte";
import { makeDossier, makeServerPage } from "./testHelpers.ts";

const state: Pick<typeof route, "url"> = route;
const origin = "http://localhost/tous-les-dossiers";
beforeEach(() => {
  state.url = new URL(origin);
  vi.mocked(goto).mockImplementation(async (url) => {
    state.url = new URL(String(url), origin);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const params = new URL(url, origin).searchParams;
      return Response.json(
        url.startsWith("/dossiers/page")
          ? makeServerPage({
              items: [makeDossier()],
              total: 21,
              page: Number(params.get("page") ?? 1),
            })
          : { activites: [], assignedDepartments: [], instructeurs: [] },
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("URL navigation cancels a pending text edit even when the URL search text is unchanged", async () => {
  render(TousPage);
  await screen.findByTestId("card-dossier");
  await fireEvent.input(screen.getByRole("searchbox"), { target: { value: "Pending search" } });
  state.url = new URL(`${origin}?page=2`);
  await tick();
  await new Promise((resolve) => {
    setTimeout(resolve, 350);
  });
  expect(state.url.searchParams.get("q")).toBeNull();
  expect(state.url.searchParams.get("page")).toBe("2");
  expect(goto).not.toHaveBeenCalled();
});

test("history navigation closes an edited filter draft and cancels its pending navigation", async () => {
  render(TousPage);
  await screen.findByTestId("card-dossier");
  await fireEvent.click(screen.getByRole("button", { name: "Filtres" }));
  await fireEvent.click(screen.getByRole("checkbox", { name: /^Instruction$/u }));
  state.url = new URL(`${origin}?page=2`);
  await tick();
  await new Promise((resolve) => {
    setTimeout(resolve, 350);
  });
  expect(screen.queryByRole("dialog", { name: "Tous les filtres" })).toBeNull();
  expect(state.url.searchParams.get("phase")).toBeNull();
  expect(state.url.searchParams.get("page")).toBe("2");
});

test("a failed query keeps its previous rows and retry replaces them", async () => {
  let fail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/dossiers/options"))
        return Response.json({ activites: [], assignedDepartments: [], instructeurs: [] });
      if (url.includes("q=new") && fail) return new Response("Unavailable", { status: 503 });
      return Response.json(
        makeServerPage({
          items: [makeDossier({ name: url.includes("q=new") ? "New result" : "Previous result" })],
          total: 1,
        }),
      );
    }),
  );
  render(TousPage);
  await screen.findByText("Previous result");
  fail = true;
  state.url = new URL(`${origin}?q=new`);
  await screen.findByRole("alert");
  expect(screen.getByText("Previous result")).toBeTruthy();
  expect(screen.queryByText(/Aucun dossier n'a été trouvé/u)).toBeNull();
  fail = false;
  await fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByText("New result");
  expect(screen.queryByText("Previous result")).toBeNull();
});
