import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock(import("$lib/upload/uploadToStorage.ts"), () => ({
  uploadFichiers: vi.fn(),
}));

import FormDecisionAdministrative from "./FormDecisionAdministrative.svelte";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.ts";

const UPLOAD_ID = "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70";

beforeEach(() => {
  vi.mocked(uploadFichiers)
    .mockReset()
    .mockImplementation(async (_dossierId, files) =>
      files.map((file) => ({ id: UPLOAD_ID as never, name: file.name })),
    );
});

afterEach(cleanup);

const TYPE_VALIDE = "Arrêté dérogation";

function decision(
  overrides: Partial<DecisionAdministrativeForTransfer> = {},
): DecisionAdministrativeForTransfer {
  return reactive({
    dossier: "dossier-test",
    ...overrides,
  } as unknown as DecisionAdministrativeForTransfer);
}

/** Crée un File dont on force la taille, sans avoir à allouer le contenu réel. */
function fichierWithSize(nom: string, mediaType: string, size: number): File {
  const file = new File(["contenu"], nom, { type: mediaType });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/** Renseigne l'input fichier comme le ferait un utilisateur (déclenche bind:files). */
async function chooseFichier(container: HTMLElement, fichier: File) {
  const input = container.querySelector<HTMLInputElement>("#upload-fichier-décision");
  if (!input) throw new Error("input fichier introuvable");

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(fichier);
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

function clickSave() {
  return page.getByRole("button", { name: /^Sauvegarder$/ }).click();
}

test("refuse une décision sans type et n'appelle pas onValidate", async () => {
  const onValidate = vi.fn();
  render(FormDecisionAdministrative, {
    decisionAdministrative: decision(),
    onValidate,
  });

  await clickSave();

  await expect.element(page.getByText(/sélectionner un type/i)).toBeVisible();
  expect(onValidate).not.toHaveBeenCalled();
});

test("refuse un format non supporté et n'appelle pas onValidate", async () => {
  const onValidate = vi.fn();
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, fichierWithSize("notes.txt", "text/plain", 1000));
  await clickSave();

  await expect.element(page.getByText(/Format de fichier non supporté/i)).toBeVisible();
  expect(onValidate).not.toHaveBeenCalled();
});

test("affiche une erreur lisible quand l'enregistrement échoue", async () => {
  const onValidate = vi.fn().mockRejectedValue(new Error("Boom serveur"));
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, new File(["%PDF-1.4"], "ok.pdf", { type: "application/pdf" }));
  await clickSave();

  await expect.element(page.getByText(/l'enregistrement de la décision/i)).toBeVisible();
  await expect.element(page.getByText(/Boom serveur/)).toBeVisible();
  expect(onValidate).toHaveBeenCalledTimes(1);
  // Le formulaire reste affiché pour permettre une nouvelle tentative.
  await expect.element(page.getByText("Type de décision")).toBeVisible();
});

test("affiche l'échec de l'envoi au stockage sous le champ fichier, sans appeler onValidate", async () => {
  vi.mocked(uploadFichiers).mockRejectedValue(
    new Error("L'envoi du fichier ok.pdf a échoué (403)."),
  );
  const onValidate = vi.fn();
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, new File(["%PDF-1.4"], "ok.pdf", { type: "application/pdf" }));
  await clickSave();

  await expect.element(page.getByText(/L'envoi du fichier ok.pdf a échoué/)).toBeVisible();
  expect(onValidate).not.toHaveBeenCalled();
  await expect.element(page.getByRole("button", { name: /^Sauvegarder$/ })).toBeEnabled();
});

test("envoie le fichier au stockage puis appelle onValidate avec sa référence", async () => {
  const onValidate = vi.fn().mockResolvedValue(undefined);
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, new File(["%PDF-1.4"], "arrete.pdf", { type: "application/pdf" }));
  await clickSave();

  await vi.waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1));

  expect(uploadFichiers).toHaveBeenCalledWith("dossier-test", [expect.any(File)]);
  const transmittedDecision = onValidate.mock.calls[0][0] as DecisionAdministrativeForTransfer;
  expect(transmittedDecision.fichier_upload).toEqual({ id: UPLOAD_ID, name: "arrete.pdf" });
});

test("affiche un état de chargement pendant l'enregistrement", async () => {
  let resolve!: () => void;
  const onValidate = vi.fn(() => new Promise<void>((r) => (resolve = r)));
  render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await clickSave();

  const savingButton = page.getByRole("button", { name: /Sauvegarde en cours/ });
  await expect.element(savingButton).toBeDisabled();

  resolve();

  await expect.element(page.getByRole("button", { name: /^Sauvegarder$/ })).toBeVisible();
});
