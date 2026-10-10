import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import PorteurDeProjet from "./PorteurDeProjet.svelte";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import {
  companyPropertyLabels,
  identityPropertyLabels,
  type FieldChange,
} from "@pitchou/types/notification.ts";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
const dossier = {
  id: 123,
  source: "demarche_numerique",
  name: "Projet test",
  porteur_de_projet: null,
  deposant_first_names: "Déposant",
  deposant_last_name: "Ancien",
  demandeur_personne_physique_email: "ancien-profil@test.fr",
  representative_first_names: "Alex",
  representative_last_name: "Robert",
} as unknown as DossierFull;

afterEach(cleanup);

test("a personne physique porteur shows its own values, not the deposant nor the old profile", () => {
  const view = render(PorteurDeProjet, {
    dossier: {
      ...dossier,
      porteur_de_projet: {
        type: "personne_physique",
        first_names: "Sam",
        last_name: "Petit",
        email: "sam@test.fr",
        address: "1 rue A\n40000 Mont",
        phone: "0102030405",
        role: "Biologiste",
      },
    },
  });
  const porteur = view.container.querySelector('[aria-label="Porteur de projet"]')!;
  for (const value of [
    "Personne physique",
    "Sam",
    "Petit",
    "sam@test.fr",
    "0102030405",
    "Biologiste",
    "40000 Mont",
  ])
    expect(porteur.textContent).toContain(value);
  for (const value of ["Déposant", "Ancien", "ancien-profil@test.fr"])
    expect(view.container.textContent).not.toContain(value);
});

test("a personne morale porteur shows its entreprise in the porteur block, without a demandeur block", () => {
  const change: FieldChange = {
    field: "entreprise.address",
    label: "Entreprise : Adresse",
    revisions: ["revision-0" as ActionDossierId],
    detected_at: new Date("2026-09-01T12:00:00Z"),
    modified_at: null,
  };
  const view = render(PorteurDeProjet, {
    dossier: {
      ...dossier,
      porteur_de_projet: {
        type: "personne_morale",
        siret: "12345678900001",
        legal_name: "Société test",
        address: "2 rue du Parc",
        admin_status: "Actif",
      },
    } as unknown as DossierFull,
    modifiedFields: new Map([[change.field, change]]),
  });
  const porteur = view.container.querySelector('[aria-label="Porteur de projet"]')!;
  expect(porteur.querySelector("h4")?.textContent).toContain("Société test");
  for (const value of ["Personne morale", "123 456 789 00001", "En activité"])
    expect(porteur.textContent).toContain(value);
  expect(porteur.querySelector(".pending")?.textContent).toContain("2 rue du Parc");
  expect(view.container.textContent).not.toContain("Le demandeur");
  expect(view.container.textContent).not.toContain("L'entreprise");
  expect(
    view.container.querySelector('[aria-label="Représentant de l\'entreprise"]'),
  ).not.toBeNull();
});

test("without porteur the block says Non renseigné, without falling back on the deposant", () => {
  const view = render(PorteurDeProjet, { dossier: { ...dossier, porteur_de_projet: null } });
  const porteur = view.container.querySelector('[aria-label="Porteur de projet"]')!;
  expect(porteur.textContent).toContain("Non renseigné");
  expect(porteur.textContent).not.toContain("Personne");
  expect(view.container.textContent).not.toContain("Déposant");
});

test("the porteur block lists every column of its personne physique or entreprise, even empty", () => {
  const labels = (porteur_de_projet: unknown) => {
    const view = render(PorteurDeProjet, {
      dossier: { ...dossier, porteur_de_projet } as DossierFull,
    });
    const text = view.container.querySelector('[aria-label="Porteur de projet"]')!.textContent;
    cleanup();
    return text;
  };

  const physique = labels({ type: "personne_physique", first_names: "Sam", last_name: "Petit" });
  for (const label of [...Object.values(identityPropertyLabels), "Adresse"])
    expect(physique).toContain(label);

  const morale = labels({ type: "personne_morale", siret: "12345678900001" });
  for (const label of Object.values(companyPropertyLabels)) expect(morale).toContain(label);
});
