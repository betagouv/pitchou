import { describe, expect, test } from "vitest";

import { historiqueEntries } from "./display.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

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
    author: "par claire.morin",
    description: "Saisine CNPN du projet test · 2 pièces jointes",
    statuses: [
      { icon: "fr-icon-checkbox-circle-line", label: "Distribué au destinataire" },
      { icon: "fr-icon-eye-line", label: "Ouverture détectée" },
    ],
  });
});
