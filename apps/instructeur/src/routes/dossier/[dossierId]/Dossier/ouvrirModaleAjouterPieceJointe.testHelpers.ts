import { expect, vi } from "vitest";
import { tick } from "svelte";
import { sendEvenement } from "$lib/shared/aarri.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export const DOSSIER_ID = 123;

export function dossier(overrides: Partial<DossierFull> = {}): DossierFull {
  return {
    id: DOSSIER_ID,
    name: "Dossier test",
    communes: null,
    departments: ["01"],
    regions: null,
    main_activite: "Travaux",
    demarche_numerique_number: 456,
    porteur_de_projet: {
      type: "personne_physique",
      last_name: "Durand",
      first_names: "Alice",
      email: null,
      address: null,
      phone: null,
      role: null,
    },
    representative_email: null,
    deposant_last_name: "Durand",
    deposant_first_names: "Alice",
    next_action_expected_from: null,
    enjeu: false,
    linked_to_ae_regime: false,
    evenementsPhase: [],
    avisExpert: [],
    decisionsAdministratives: [],
    piecesJointesPetitionnaires: [],
    otherAttachments: [],
    ...overrides,
  } as unknown as DossierFull;
}

export function expectTracking(source: string) {
  expect(sendEvenement).toHaveBeenCalledWith({
    type: "ouvrirModaleAjouterPieceJointe",
    details: { dossierId: DOSSIER_ID, source },
  });
}

export async function chooseFichiers(container: HTMLElement, fichiers: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("input fichier introuvable");
  const dataTransfer = new DataTransfer();
  for (const fichier of fichiers) dataTransfer.items.add(fichier);
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

export async function fillTypeAutre(container: HTMLElement, type: string) {
  const input = container.querySelector<HTMLInputElement>('input[id^="other-attachment-type-"]');
  if (!input) throw new Error("input type autre introuvable");
  input.value = type;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

export function setupDsfrModalMock() {
  Object.assign(window, {
    dsfr: vi.fn(() => ({ modal: { conceal: vi.fn(), disclose: vi.fn() } })),
  });
}
