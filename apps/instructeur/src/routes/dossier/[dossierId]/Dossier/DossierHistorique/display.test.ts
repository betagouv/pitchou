import { describe, expect, test } from "vitest";

import { historiqueEntries } from "./display.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";

function dossierWithSource(source: string): DossierFull {
  return {
    depot_date: new Date("2026-01-15"),
    source,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
  } as unknown as DossierFull;
}

function depotEntry(source: string) {
  return historiqueEntries([], dossierWithSource(source)).find(({ id }) => id === "virtual-depot");
}

describe("historique — entrée de dépôt", () => {
  test.each([
    ["demarche_numerique", "Dossier déposé sur Démarches Numériques", "petitionnaire"],
    ["pitchou", "Dossier créé dans Pitchou", "system"],
    ["gunenv", "Dossier importé depuis GunEnv", "system"],
    ["onagre", "Dossier importé depuis Onagre", "system"],
    ["import_fichier", "Dossier importé depuis un fichier du service", "system"],
    ["unknown", "Dossier importé dans Pitchou", "system"],
  ])("source %s → « %s »", (source, label, tone) => {
    const entry = depotEntry(source);
    expect(entry?.label).toBe(label);
    expect(entry?.tone).toBe(tone);
  });
});

test("ajoute les envois CNPN et leur suivi", () => {
  const dossier = {
    ...dossierWithSource("pitchou"),
    cnpnEmailSentEvents: [
      {
        id: "email-1",
        sent_by_email: "claire.morin@example.com",
        sent_at: new Date("2026-08-20T10:30:00Z"),
        delivered_at: new Date("2026-08-20T10:31:00Z"),
        opened_at: new Date("2026-08-20T11:00:00Z"),
        subject: "Saisine CNPN du projet test",
        attachment_names: ["saisine.pdf", "dossier.pdf"],
      },
    ],
  } as unknown as DossierFull;

  expect(historiqueEntries([], dossier)[0]).toMatchObject({
    id: "cnpn-email-email-1",
    icon: "fr-icon-mail-line",
    tone: "instructeur",
    label: "Mail de saisine du CNPN envoyé",
    date: new Date("2026-08-20T10:30:00Z"),
    timeKnown: true,
    author: "par claire.morin",
    description: "Saisine CNPN du projet test · 2 pièces jointes",
    statuses: [
      {
        icon: "fr-icon-checkbox-circle-line",
        label: "Distribué au destinataire",
        date: new Date("2026-08-20T10:31:00Z"),
      },
      {
        icon: "fr-icon-eye-line",
        label: "Ouverture détectée",
        date: new Date("2026-08-20T11:00:00Z"),
      },
    ],
  });
});

test("sorts serialized CNPN sends with actions and milestones without inventing receipts", () => {
  const dossier = {
    ...dossierWithSource("pitchou"),
    cnpnEmailSentEvents: [
      {
        id: "email-1",
        sent_by_email: null,
        sent_at: "2026-08-20T10:30:00Z",
        delivered_at: null,
        opened_at: null,
        subject: "Saisine CNPN",
        attachment_names: ["saisine.pdf"],
      },
      {
        id: "email-2",
        sent_by_email: "claire.morin@example.com",
        sent_at: "2026-08-22T10:30:00Z",
        delivered_at: "2026-08-22T10:31:00Z",
        opened_at: null,
        subject: "Complément CNPN",
        attachment_names: [],
      },
    ],
  } as unknown as DossierFull;
  const actions = [
    {
      id: "action-1",
      type: "dossier_suivi",
      created_at: "2026-08-21T10:00:00Z",
      author_email: "claire.morin@example.com",
      data: { follower: "claire.morin@example.com" },
    },
  ] as unknown as DossierAction[];

  const entries = historiqueEntries(actions, dossier);
  expect(entries.map(({ id }) => id)).toEqual([
    "cnpn-email-email-2",
    "action-1",
    "cnpn-email-email-1",
    "virtual-depot",
  ]);
  expect(entries[0]).toMatchObject({
    date: new Date("2026-08-22T10:30:00Z"),
    description: "Complément CNPN",
    statuses: [{ label: "Distribué au destinataire", date: new Date("2026-08-22T10:31:00Z") }],
  });
  expect(entries[2]).toMatchObject({
    tone: "system",
    author: undefined,
    description: "Saisine CNPN · 1 pièce jointe",
    statuses: [],
  });
});
