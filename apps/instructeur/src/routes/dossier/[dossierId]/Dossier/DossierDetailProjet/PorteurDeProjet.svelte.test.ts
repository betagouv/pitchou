import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { store } from "$lib/state/store.svelte.ts";
import { registerReviewSnapshot } from "$lib/dossier/notification/snapshot.ts";
import PorteurDeProjet from "./PorteurDeProjet.svelte";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type {
  DossierNotification,
  FieldChange,
  NotificationUpdate,
} from "@pitchou/types/notification.ts";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
const dossier = {
  id: 123,
  source: "demarche_numerique",
  name: "Projet test",
  porteur_de_projet: {
    type: "personne_physique",
    first_names: "Camille",
    last_name: "Martin",
    email: null,
    address: null,
    phone: null,
    role: null,
  },
  deposant_first_names: "Déposant",
  deposant_last_name: "Ancien",
  demandeur_personne_physique_email: "ancien-profil@test.fr",
  mandataire_first_names: "Lou",
  mandataire_last_name: "Durand",
  mandataire_email: "lou@test.fr",
  representative_first_names: "Alex",
  representative_last_name: "Robert",
  representative_role: "Écologue",
  especesImpactees: { impacts: [], sourceFile: undefined },
  piecesJointesPetitionnaires: [],
} as unknown as DossierFull;
const fields = [
  ["demandeur.email", "Demandeur : Adresse électronique"],
  ["mandataire.last_name", "Mandataire : Nom"],
  ["representant.role", "Représentant de l'entreprise : Qualité"],
] as const;
const changes = (): FieldChange[] =>
  fields.map(([field, label], index) => ({
    field,
    label,
    revisions: [`revision-${index}` as ActionDossierId],
    detected_at: new Date("2026-09-01T12:00:00Z"),
    modified_at: null,
  }));
const notification = (): DossierNotification => ({
  dossier: dossier.id,
  viewed: false,
  updated_at: new Date("2026-09-01T12:00:00Z"),
  viewed_at: null,
  new_arrival: null,
  new_follow: null,
  changes: changes(),
});

beforeEach(() => {
  store.notificationByDossier.set(dossier.id, notification());
  dossier.notificationSnapshot = notification();
  registerReviewSnapshot(dossier);
});
afterEach(() => {
  cleanup();
  store.notificationByDossier.clear();
  store.capabilities = {};
});

test("only the changed identity properties are highlighted, including a cleared email", () => {
  const view = render(PorteurDeProjet, {
    dossier,
    modifiedFields: new Map(changes().map((change) => [change.field, change])),
  });
  const highlights = [...view.container.querySelectorAll(".pending")];
  expect(highlights).toHaveLength(3);
  const text = highlights.map((element) => element.textContent).join(" ");
  expect(text).toContain("Non renseigné");
  expect(text).toContain("Durand");
  expect(text).toContain("Écologue");
  for (const unchanged of ["Camille", "Martin", "Lou", "Alex", "Robert"])
    expect(text).not.toContain(unchanged);
  expect(view.container.textContent).not.toContain("ancien-profil@test.fr");
  expect(view.container.querySelector("section.pending")).toBeNull();
  expect(view.container.querySelector(".pending .field-change")).toBeNull();
  expect(view.container.textContent?.replace(/\s+/g, " ")).toContain("Modifié le 01/09/2026");
});

test("property acknowledgments submit only that revision and clear the porteur badge after the last one", async () => {
  const update = vi.fn(async (request: NotificationUpdate) => {
    const current = store.notificationByDossier.get(dossier.id)!;
    const remaining = current.changes.filter(
      (change) => !change.revisions.some((id) => request.revisions?.includes(id)),
    );
    return { ...current, dossier: dossier.id, changes: remaining, viewed: remaining.length === 0 };
  });
  store.capabilities = { updateNotificationForDossier: update };
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  const accordion = [...view.container.querySelectorAll<HTMLButtonElement>("h3 button")].find(
    (button) => button.textContent?.includes("Porteur de projet"),
  )!;
  accordion.click();
  await tick();
  for (let index = 0; index < fields.length; index++) {
    const button = [
      ...view.container.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
    ].find(
      (button) =>
        button.getAttribute("aria-label") === `Valider la modification : ${fields[index][1]}`,
    )!;
    button.click();
    await vi.waitFor(() =>
      expect(view.container.querySelectorAll(".pending")).toHaveLength(fields.length - index - 1),
    );
    expect(update).toHaveBeenLastCalledWith({
      dossier: dossier.id,
      revisions: [`revision-${index}`],
    });
    if (index < fields.length - 1)
      expect(accordion.textContent).toContain("Nouvelles modifications");
  }
  expect(accordion.textContent).not.toContain("Nouvelles modifications");
  expect(store.notificationByDossier.get(dossier.id)?.viewed).toBe(true);
  store.notificationByDossier.set(dossier.id, {
    ...notification(),
    changes: [{ ...changes()[0], revisions: ["new-revision" as ActionDossierId] }],
  });
  const fresh = {
    ...dossier,
    notificationSnapshot: {
      ...notification(),
      changes: [{ ...changes()[0], revisions: ["new-revision" as ActionDossierId] }],
    },
  };
  registerReviewSnapshot(fresh);
  await view.rerender({ dossier: fresh, anomalies: undefined });
  await tick();
  expect(view.container.querySelectorAll(".pending")).toHaveLength(1);
  expect(accordion.textContent).toContain("Nouvelles modifications");
});

test("coarse historical entries remain reviewable without claiming every identity field changed", () => {
  const legacy = { ...changes()[0], field: "Demandeur", label: "Demandeur" };
  const view = render(PorteurDeProjet, {
    dossier,
    modifiedFields: new Map([[legacy.field, legacy]]),
  });
  expect(view.container.querySelector('[aria-label="Porteur de projet"] .pending')).toBeNull();
  const history = view.container.querySelector('[aria-label="Modifications antérieures"]')!;
  expect(history.textContent).toContain("Le détail du champ modifié n'a pas été enregistré");
  expect(history.querySelector("button")?.getAttribute("aria-label")).toBe(
    "Valider la modification : Demandeur",
  );
});
