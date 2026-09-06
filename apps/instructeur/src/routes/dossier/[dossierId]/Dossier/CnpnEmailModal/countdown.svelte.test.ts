import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { RequestError } from "$lib/shared/createCapObjectFromURLs/requestWrappers.ts";
import { CnpnEmailModal, sendCnpnEmail } from "./setup.ts";
import { dossier } from "./fixtures.ts";

test("attend trois secondes et permet d'annuler sans perdre le brouillon", async () => {
  render(CnpnEmailModal, { dossier, email: "sender@example.com", followers: [], onClose: vi.fn() });
  await page.getByLabelText("Objet").fill("Mon brouillon");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect
    .element(page.getByRole("button", { name: "Envoi dans 3 s · Annuler l'envoi" }))
    .toBeEnabled();
  await expect.element(page.getByLabelText("Objet")).toBeDisabled();
  await vi.advanceTimersByTimeAsync(1000);
  await expect
    .element(page.getByRole("button", { name: "Envoi dans 2 s · Annuler l'envoi" }))
    .toBeEnabled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(sendCnpnEmail).not.toHaveBeenCalled();
  await page.getByRole("button", { name: "Envoi dans 1 s · Annuler l'envoi" }).click();
  await vi.advanceTimersByTimeAsync(5000);
  expect(sendCnpnEmail).not.toHaveBeenCalled();
  await expect.element(page.getByLabelText("Objet")).toBeEnabled();
  await expect.element(page.getByLabelText("Objet")).toHaveValue("Mon brouillon");

  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(2999);
  expect(sendCnpnEmail).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(1);
});

test("Échap annule le compte à rebours sans fermer le brouillon", async () => {
  const onClose = vi.fn();
  render(CnpnEmailModal, { dossier, email: "sender@example.com", followers: [], onClose });
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await userEvent.keyboard("{Escape}");
  await vi.advanceTimersByTimeAsync(3000);
  expect(sendCnpnEmail).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect.element(page.getByLabelText("Objet")).toBeEnabled();
});

test.each(["fermeture", "démontage"])("annule l'envoi en attente lors de la %s", async (action) => {
  const view = render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  if (action === "fermeture")
    view.container.querySelector<HTMLButtonElement>("footer button")!.click();
  else view.unmount();
  await vi.advanceTimersByTimeAsync(5000);
  expect(sendCnpnEmail).not.toHaveBeenCalled();
});

test("annuler une nouvelle tentative conserve le payload figé et son identifiant", async () => {
  vi.mocked(sendCnpnEmail).mockRejectedValueOnce(
    new RequestError(502, "Réessayez sans modifier le mail."),
  );
  render(CnpnEmailModal, { dossier, email: "sender@example.com", followers: [], onClose: vi.fn() });
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(3000);
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await page.getByRole("button", { name: "Envoi dans 3 s · Annuler l'envoi" }).click();
  await expect.element(page.getByLabelText("Objet")).toBeDisabled();
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await vi.advanceTimersByTimeAsync(3000);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(2);
  expect(vi.mocked(sendCnpnEmail).mock.calls[1]).toEqual(vi.mocked(sendCnpnEmail).mock.calls[0]);
});

test("ignore les soumissions supplémentaires pendant le compte à rebours et l'envoi", async () => {
  vi.mocked(sendCnpnEmail).mockReturnValueOnce(new Promise(() => {}));
  const { container } = render(CnpnEmailModal, {
    dossier,
    email: "sender@example.com",
    followers: [],
    onClose: vi.fn(),
  });
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  container.querySelector("form")!.requestSubmit();
  await tick();
  await vi.advanceTimersByTimeAsync(3000);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(1);
  container.querySelector("form")!.requestSubmit();
  await vi.advanceTimersByTimeAsync(3000);
  expect(sendCnpnEmail).toHaveBeenCalledTimes(1);
});
