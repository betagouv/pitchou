import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, waitFor } from "@testing-library/svelte";
import { RequestError } from "$lib/shared/createCapObjectFromURLs/requestWrappers.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import {
  CnpnEmailModal,
  createCnpnEmailDraft,
  sendCnpnEmail,
  refreshDossierFull,
} from "./CnpnEmailModal/setup.ts";
import { dossier, latestSaisineId, saisineId } from "./CnpnEmailModal/fixtures.ts";

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
    onClose: vi.fn(),
  });

  await expect
    .element(page.getByRole("group", { name: "Destinataire" }))
    .toHaveTextContent("derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr");
  await expect
    .element(page.getByText("Un accusé de lecture du mail vous sera communiqué."))
    .toBeVisible();
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

  expect(sendCnpnEmail).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(3000);

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

test("présélectionne seulement la saisine CNPN la plus récente", async () => {
  const dossierWithTwoCnpnSaisines = {
    ...dossier,
    avisExpert: [
      ...dossier.avisExpert,
      {
        expert: "CNPN",
        saisine_date: "2026-08-15",
        saisine_fichier_url: `/avis-expert/fichier/${latestSaisineId}`,
        saisine_fichier_description: {
          id: latestSaisineId,
          name: "saisine-recente.pdf",
          media_type: "application/pdf",
          size: 2048,
          url: `/avis-expert/fichier/${latestSaisineId}`,
        },
      },
    ],
  } as unknown as DossierFull;
  render(CnpnEmailModal, {
    dossier: dossierWithTwoCnpnSaisines,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });

  await page.getByRole("button", { name: /Pièces jointes/ }).click();

  await expect.element(page.getByLabelText(/saisine\.pdf/)).not.toBeChecked();
  await expect.element(page.getByLabelText(/saisine-recente\.pdf/)).toBeChecked();
});

test("propose les options d'alignement du corps du mail", async () => {
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });

  const justify = page.getByRole("button", { name: "Justifier" });
  await justify.click();
  await expect.element(justify).toHaveAttribute("aria-pressed", "true");
  await expect.element(page.getByRole("button", { name: "Aligner à droite" })).toBeVisible();
});

test("permet de corriger le mail après une erreur de validation", async () => {
  vi.mocked(sendCnpnEmail).mockRejectedValueOnce(
    new RequestError(
      413,
      "Le mail et les pièces jointes dépassent la limite de 20 Mo après encodage.",
    ),
  );
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });

  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(3000);

  await expect.element(page.getByRole("alert")).toHaveTextContent("dépassent la limite");
  const alert = page.getByRole("alert").element();
  expect(alert.closest("footer")).not.toBeNull();
  expect(alert.nextElementSibling?.textContent).toContain("Annuler");
  await expect.element(page.getByLabelText("Objet")).not.toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Envoyer", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: /Pièces jointes/ }).click();
  await page.getByLabelText(/saisine\.pdf/).click();
  await expect.element(page.getByLabelText(/saisine\.pdf/)).not.toBeChecked();
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(3000);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(2);
  await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
  expect(vi.mocked(sendCnpnEmail).mock.calls[1][1]).toEqual({
    ...vi.mocked(sendCnpnEmail).mock.calls[0][1],
    attachmentIds: [],
  });
});

test("bloque un nouvel envoi lorsque le résultat Brevo est incertain", async () => {
  vi.mocked(sendCnpnEmail).mockRejectedValueOnce(
    new RequestError(504, "Le résultat de l'envoi est incertain."),
  );
  render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });

  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(3000);

  await expect.element(page.getByRole("alert")).toHaveTextContent("incertain");
  await expect.element(page.getByLabelText("Objet")).toBeDisabled();
  await expect.element(page.getByRole("button", { name: "Envoi à vérifier" })).toBeDisabled();
});
