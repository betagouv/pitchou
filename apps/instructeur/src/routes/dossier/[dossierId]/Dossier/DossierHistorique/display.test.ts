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
