import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";

vi.mock(import("$lib/shared/aarri.ts"), () => ({ sendEvenement: vi.fn() }));

vi.mock(import("./download.ts"), () => ({ downloadUrls: vi.fn(async () => {}) }));

vi.mock(import("./mail.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  openMailClient: vi.fn(),
}));

import { sendEvenement } from "$lib/shared/aarri.ts";
import { downloadUrls } from "./download.ts";
import { DEFAULT_MAIL_RECIPIENT, openMailClient } from "./mail.ts";
import SendByMailModal from "./SendByMailModal.svelte";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const dossier = {
  id: 42,
  name: "Parc éolien de Test",
  avisExpert: [],
  decisionsAdministratives: [],
  otherAttachments: [],
  piecesJointesPetitionnaires: [
    {
      url: "/piece-jointe-petitionnaire/fichier/1",
      name: "etude-impact.pdf",
      media_type: "application/pdf",
      size: 1024,
      demarche_numerique_created_at: "2026-01-15",
    },
  ],
} as unknown as DossierFull;

function renderModal(documentText: string) {
  return render(SendByMailModal, {
    open: true,
    dossier,
    documentName: "Mail Saisine CNPN-2026-08-25T14:30.odt",
    documentUrl: "blob:generated-document",
    documentText,
    onClose: () => {},
  });
}

beforeEach(() => {
  vi.mocked(sendEvenement).mockClear();
  vi.mocked(downloadUrls).mockClear();
  vi.mocked(openMailClient).mockClear();
});

afterEach(cleanup);

test("reprend l'objet écrit en tête du document et le retire du corps", async () => {
  renderModal("Saisine du CNPN - Parc éolien\n\nBonjour,\nVoici la saisine.");

  await expect.element(page.getByLabelText("Destinataire")).toHaveValue(DEFAULT_MAIL_RECIPIENT);
  await expect.element(page.getByLabelText("Objet")).toHaveValue("Saisine du CNPN - Parc éolien");
  await expect
    .element(page.getByLabelText(/Corps du message/))
    .toHaveValue("Bonjour,\nVoici la saisine.");
});

test("se rabat sur le nom du document quand celui-ci n'a pas d'objet exploitable", async () => {
  renderModal(`${"Phrase très longue. ".repeat(20)}\n\nBonjour,`);

  await expect
    .element(page.getByLabelText("Objet"))
    .toHaveValue("Mail Saisine CNPN - Parc éolien de Test");
});

test("joint le document généré par défaut et transmet le corps au client mail", async () => {
  renderModal("Saisine du CNPN\n\nBonjour,\nVoici la saisine.");

  await page.getByRole("button", { name: /Ouvrir dans mon logiciel de messagerie/ }).click();

  await waitFor(() => {
    expect(downloadUrls).toHaveBeenCalledWith([
      { url: "blob:generated-document", name: "Mail Saisine CNPN-2026-08-25T14:30.odt" },
    ]);
  });

  const mailtoUrl = vi.mocked(openMailClient).mock.calls[0][0];
  expect(mailtoUrl).toContain(DEFAULT_MAIL_RECIPIENT);
  expect(new URLSearchParams(mailtoUrl.slice(mailtoUrl.indexOf("?") + 1)).get("body")).toBe(
    "Bonjour,\nVoici la saisine.",
  );
  expect(sendEvenement).toHaveBeenCalledWith({
    type: "envoyerUnDocumentParMail",
    details: { dossierId: 42 },
  });
});

test("télécharge les pièces jointes cochées du dossier", async () => {
  renderModal("Saisine du CNPN\n\nBonjour");

  await page.getByLabelText(/etude-impact\.pdf/).click();
  await page.getByRole("button", { name: /Ouvrir dans mon logiciel de messagerie/ }).click();

  await waitFor(() => {
    expect(downloadUrls).toHaveBeenCalledWith([
      { url: "blob:generated-document", name: "Mail Saisine CNPN-2026-08-25T14:30.odt" },
      { url: "/piece-jointe-petitionnaire/fichier/1", name: "etude-impact.pdf" },
    ]);
  });
});

test("copie le corps dans le presse-papier quand il est trop long pour une URL mailto", async () => {
  const clipboardWrite = vi.fn(async () => {});
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue({
    writeText: clipboardWrite,
  } as unknown as Clipboard);

  const longBody = "Corps très long. ".repeat(200);
  renderModal(longBody);

  await expect.element(page.getByText(/copié dans votre presse-papier/)).toBeVisible();
  await page.getByRole("button", { name: /Ouvrir dans mon logiciel de messagerie/ }).click();

  await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(longBody));

  const mailtoUrl = vi.mocked(openMailClient).mock.calls[0][0];
  expect(new URLSearchParams(mailtoUrl.slice(mailtoUrl.indexOf("?") + 1)).get("body")).toBe("");
});
