import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";

import FormDecisionAdministrative from "./FormDecisionAdministrative.svelte";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.ts";

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

test("traduit un rejet 413 en message « fichier trop volumineux »", async () => {
  const onValidate = vi.fn().mockRejectedValue(new Error("413 Payload Too Large"));
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, new File(["%PDF-1.4"], "ok.pdf", { type: "application/pdf" }));
  await clickSave();

  await expect.element(page.getByText(/trop volumineux pour être envoyé/i)).toBeVisible();
});

test("appelle onValidate avec le fichier encodé en base64 quand tout est valide", async () => {
  const onValidate = vi.fn().mockResolvedValue(undefined);
  const { container } = render(FormDecisionAdministrative, {
    decisionAdministrative: decision({ type: TYPE_VALIDE }),
    onValidate,
  });

  await chooseFichier(container, new File(["%PDF-1.4"], "arrete.pdf", { type: "application/pdf" }));
  await clickSave();

  await vi.waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1));

  const transmittedDecision = onValidate.mock.calls[0][0] as DecisionAdministrativeForTransfer;
  expect(transmittedDecision.fichier_base64).toMatchObject({
    name: "arrete.pdf",
    media_type: "application/pdf",
  });
  expect(transmittedDecision.fichier_base64?.contenuBase64.length).toBeGreaterThan(0);
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
