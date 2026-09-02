import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";

vi.mock(import("./cnpnEmailDraft.ts"), () => ({
  createCnpnEmailDraft: vi.fn().mockResolvedValue({
    subject: "Saisine du CNPN - Projet test",
    htmlBody: "<p>Bonjour</p>",
  }),
  updateCnpnAttachmentList: (html: string) => html,
}));
vi.mock(import("./sendCnpnEmail.ts"), () => ({ sendCnpnEmail: vi.fn() }));
vi.mock(import("$lib/dossier/dossier.ts"), () => ({ refreshDossierFull: vi.fn() }));
vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_PITCHOU_ENV: "" } }));

import { createCnpnEmailDraft } from "./cnpnEmailDraft.ts";
import { sendCnpnEmail } from "./sendCnpnEmail.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { RequestError } from "$lib/shared/createCapObjectFromURLs/requestWrappers.ts";
import CnpnEmailModal from "./CnpnEmailModal.svelte";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const saisineId = "11111111-1111-4111-8111-111111111111" as FileId;
const csrpnSaisineId = "22222222-2222-4222-8222-222222222222" as FileId;
const dossier = {
  id: 42,
  name: "Projet test",
  piecesJointesPetitionnaires: [],
  avisExpert: [
    {
      expert: "CNPN",
      saisine_date: "2026-08-01",
      saisine_fichier_url: `/avis-expert/fichier/${saisineId}`,
      saisine_fichier_description: {
        id: saisineId,
        name: "saisine.pdf",
        media_type: "application/pdf",
        size: 1024,
        url: `/avis-expert/fichier/${saisineId}`,
      },
    },
    {
      expert: "CSRPN",
      saisine_date: "2026-08-01",
      saisine_fichier_url: `/avis-expert/fichier/${csrpnSaisineId}`,
      saisine_fichier_description: {
        id: csrpnSaisineId,
        name: "saisine-csrpn.pdf",
        media_type: "application/pdf",
        size: 2048,
        url: `/avis-expert/fichier/${csrpnSaisineId}`,
      },
    },
  ],
  decisionsAdministratives: [],
  otherAttachments: [],
} as unknown as DossierFull;

beforeEach(() => {
  vi.mocked(createCnpnEmailDraft).mockReset().mockResolvedValue({
    subject: "Saisine du CNPN - Projet test",
    htmlBody: "<p>Bonjour</p>",
  });
  vi.mocked(sendCnpnEmail)
    .mockReset()
    .mockResolvedValue({} as never);
  vi.mocked(refreshDossierFull).mockReset().mockResolvedValue(dossier);
});

afterEach(cleanup);

test("ouvre la modale avant la fin de la préparation du mail", async () => {
  const rootOverflow = document.documentElement.style.overflow;
  const bodyOverflow = document.body.style.overflow;
  let resolveDraft!: (draft: { subject: string; htmlBody: string }) => void;
  vi.mocked(createCnpnEmailDraft).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDraft = resolve;
    }),
  );

  const view = render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    especesImpactees: undefined,
    onClose: vi.fn(),
  });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect.element(page.getByRole("status")).toHaveTextContent("Préparation du mail");
  expect(document.documentElement.style.overflow).toBe("hidden");
  expect(document.body.style.overflow).toBe("hidden");

  resolveDraft({ subject: "Saisine du CNPN - Projet test", htmlBody: "<p>Bonjour</p>" });
  await expect.element(page.getByLabelText("Objet")).toBeVisible();
  view.unmount();
  expect(document.documentElement.style.overflow).toBe(rootOverflow);
  expect(document.body.style.overflow).toBe(bodyOverflow);
});

test("préremplit les destinataires et envoie la saisine sélectionnée", async () => {
  vi.mocked(refreshDossierFull).mockRejectedValueOnce(new Error("refresh failed"));
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: ["follower@example.com"],
    especesImpactees: undefined,
    onClose: vi.fn(),
  });

  await expect
    .element(page.getByRole("group", { name: "Destinataire" }))
    .toHaveTextContent("derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr");
  await expect.element(page.getByText("Environnement de test")).toBeVisible();
  await expect
    .element(page.getByLabelText("Destinataire de test"))
    .toHaveValue("sender@example.com");
  await page.getByLabelText("Destinataire de test").fill("recipient@example.com");
  await expect.element(page.getByText("follower@example.com")).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer follower@example.com des personnes en copie" })
    .click();
  await expect.element(page.getByLabelText(/saisine\.pdf/)).not.toBeInTheDocument();
  await page.getByRole("button", { name: /Pièces jointes/ }).click();
  await expect.element(page.getByLabelText(/saisine\.pdf/)).toBeChecked();
  await expect.element(page.getByLabelText(/saisine-csrpn\.pdf/)).not.toBeChecked();
  await page.getByLabelText(/En copie/).fill("cheffe@example.com");
  await page.getByRole("option", { name: "Ajouter l'adresse cheffe@example.com" }).click();
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();

  await waitFor(() =>
    expect(sendCnpnEmail).toHaveBeenCalledWith(42, {
      requestId: expect.any(String),
      recipient: "recipient@example.com",
      subject: "Saisine du CNPN - Projet test",
      htmlBody: "<p>Bonjour</p>",
      cc: ["cheffe@example.com"],
      attachmentIds: [saisineId],
    }),
  );
  expect(refreshDossierFull).toHaveBeenCalledWith(42);
  await expect.element(page.getByRole("status")).toHaveTextContent("Mail envoyé");
});

test("propose les options d'alignement du corps du mail", async () => {
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    especesImpactees: undefined,
    onClose: vi.fn(),
  });

  const justify = page.getByRole("button", { name: "Justifier" });
  await justify.click();
  await expect.element(justify).toHaveAttribute("aria-pressed", "true");
  await expect.element(page.getByRole("button", { name: "Aligner à droite" })).toBeVisible();
});

test("permet de corriger le mail après une erreur de validation", async () => {
  vi.mocked(sendCnpnEmail).mockRejectedValueOnce(
    new RequestError(413, "Les pièces jointes dépassent la limite de 15 Mo."),
  );
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    especesImpactees: undefined,
    onClose: vi.fn(),
  });

  await page.getByRole("button", { name: "Envoyer", exact: true }).click();

  await expect.element(page.getByRole("alert")).toHaveTextContent("dépassent la limite");
  await expect.element(page.getByLabelText("Objet")).not.toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Envoyer", exact: true })).toBeEnabled();
});

test("bloque un nouvel envoi lorsque le résultat Brevo est incertain", async () => {
  vi.mocked(sendCnpnEmail).mockRejectedValueOnce(
    new RequestError(504, "Le résultat de l'envoi est incertain."),
  );
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    especesImpactees: undefined,
    onClose: vi.fn(),
  });

  await page.getByRole("button", { name: "Envoyer", exact: true }).click();

  await expect.element(page.getByRole("alert")).toHaveTextContent("incertain");
  await expect.element(page.getByLabelText("Objet")).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Envoi à vérifier" })).toBeDisabled();
});
