import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/mes-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendEvenement: vi.fn(),
  sendDossierSearchEvent: vi.fn(),
}));
import MesPage from "../../../routes/mes-dossiers/+page.svelte";
import { store } from "#lib/state/store.svelte.ts";
import { dossierId, makeDossier, makeNotification, makeServerPage } from "./testHelpers.ts";

const email = "test@example.fr";
let followed: boolean;
let dueDate: Date | null;
let fetcher: ReturnType<typeof vi.fn>;
let legacy = vi.fn<() => Promise<never>>();
beforeEach(() => {
  followed = true;
  dueDate = new Date("2026-12-12T00:00:00Z");
  store.identité = { email, groupesInstructeurs: [], estAdmin: false };
  legacy = vi
    .fn<() => Promise<never>>()
    .mockRejectedValue(new Error("Must not fetch full collections"));
  store.capabilities = {
    listerDossiers: legacy,
    listerNotifications: legacy,
    listFollowRelations: legacy,
    updateFollowRelation: vi.fn().mockImplementation(async () => {
      followed = false;
    }),
    listDossierFollowerCandidates: vi.fn().mockResolvedValue([{ email, followsDossier: true }]),
    updateDossierFollowers: vi.fn().mockImplementation(async () => {
      followed = false;
    }),
    modifierDossier: vi.fn().mockImplementation(async (_id, update) => {
      dueDate = update.next_due_date;
    }),
  };
  fetcher = vi.fn(async (url: string) =>
    Response.json(
      url.startsWith("/dossiers/options")
        ? { activites: [], assignedDepartments: ["75"], instructeurs: followed ? [email] : [] }
        : makeServerPage({
            items: followed
              ? [makeDossier({ name: "Followed project", next_due_date: dueDate })]
              : [],
            total: followed ? 1 : 0,
            totalDemandes: followed ? 1 : 0,
            scopeTotal: followed ? 1 : 0,
            followRelations: followed ? [[email, [dossierId(1)]]] : [],
            notifications: followed
              ? [
                  {
                    ...makeNotification({
                      viewed: false,
                      new_follow: { revision: "1", detected_at: new Date() },
                    }),
                    dossier: dossierId(1),
                  },
                ]
              : [],
          }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.identité = undefined;
  store.followRelations = undefined;
  store.notificationByDossier.clear();
  store.dossierSummaries.clear();
  vi.unstubAllGlobals();
});
async function openAction(name: string) {
  await fireEvent.click(screen.getByRole("button", { name: /Plus d’actions/u }));
  await fireEvent.click(screen.getByRole("menuitem", { name }));
}

test("publishes page badges and reloads membership/options after unfollowing without global loaders", async () => {
  render(MesPage);
  await screen.findByText("Followed project");
  expect(screen.getByText("Nouveau suivi")).toBeTruthy();
  expect(screen.getByTestId("card-dossier")).toHaveClass("unread");
  await fireEvent.click(screen.getByRole("button", { name: "Ne plus suivre" }));
  await screen.findByText(/Vous ne suivez aucun dossier/u);
  expect(screen.queryByTestId("card-dossier")).toBeNull();
  expect(fetcher.mock.calls.filter(([url]) => url.startsWith("/dossiers/options"))).toHaveLength(2);
  expect(store.capabilities.updateFollowRelation).toHaveBeenCalledWith(
    "laisser",
    email,
    dossierId(1),
  );
  expect(legacy).not.toHaveBeenCalled();
});

test("assignment save invalidates the server page and filter choices without full notifications", async () => {
  render(MesPage);
  await screen.findByText("Followed project");
  await openAction("Faire suivre le dossier");
  const remove = await screen.findByRole("button", {
    name: `Retirer ${email} des personnes qui suivent le dossier`,
  });
  await fireEvent.click(remove);
  await fireEvent.click(screen.getByRole("button", { name: "Attribuer le dossier" }));
  await screen.findByText(/Vous ne suivez aucun dossier/u);
  expect(store.capabilities.updateDossierFollowers).toHaveBeenCalledWith(dossierId(1), []);
  expect(fetcher.mock.calls.filter(([url]) => url.startsWith("/dossiers/options"))).toHaveLength(2);
  expect(legacy).not.toHaveBeenCalled();
});

test("due-date editor starts from the current page and refreshes after a successful save", async () => {
  render(MesPage);
  await screen.findByText("Followed project");
  await openAction("Modifier la date de la prochaine échéance");
  const input = screen.getByRole("textbox", { name: "Date de la prochaine échéance" });
  expect(input).toHaveValue("12/12/2026");
  await fireEvent.input(input, { target: { value: "31/12/2026" } });
  await fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await expect
    .poll(() => fetcher.mock.calls.filter(([url]) => url.startsWith("/dossiers/page")).length)
    .toBe(2);
  expect(dueDate?.getDate()).toBe(31);
  expect(store.dossierSummaries.get(dossierId(1))?.next_due_date?.getDate()).toBe(31);
  expect(legacy).not.toHaveBeenCalled();
});
