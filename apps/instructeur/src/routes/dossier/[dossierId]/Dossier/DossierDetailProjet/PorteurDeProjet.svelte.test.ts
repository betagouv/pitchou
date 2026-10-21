import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { store } from "#lib/state/store.svelte.ts";
import { registerReviewSnapshot } from "#lib/dossier/notification/snapshot.ts";
import PorteurDeProjet from "./PorteurDeProjet.svelte";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type {
  DossierNotification,
  FieldChange,
  NotificationUpdate,
} from "@pitchou/types/notification.ts";

vi.mock("$app/env/public", () => ({ PUBLIC_PITCHOU_ENV: "" }));
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
  demandeur_personne_physique_email: "ancien-profil@test.fr",
  acteurs: [
    {
      involvements: ["mandataire", "deposant"],
      first_names: "Lou",
      last_name: "Durand",
      email: "lou@test.fr",
      address: null,
      phone: null,
      role: null,
    },
    {
      involvements: ["personne_contact"],
      first_names: "Alex",
      last_name: "Robert",
      email: null,
      address: null,
      phone: null,
      role: "Écologue",
    },
  ],
  especesImpactees: { impacts: [], sourceFile: undefined },
  piecesJointesPetitionnaires: [],
} as unknown as DossierFull;
const fields = [
  [
    "beneficiaire_demarche_numerique.email",
    "Bénéficiaire Démarche Numérique : Adresse électronique",
  ],
  ["mandataire.last_name", "Mandataire : Nom"],
  ["personne_contact.role", "Personne contact : Qualité"],
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

test("only the changed porteur and acteur properties are highlighted, including a cleared email", () => {
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
  expect(view.container.textContent?.replaceAll(/\s+/gu, " ")).toContain("Modifié le 01/09/2026");
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
