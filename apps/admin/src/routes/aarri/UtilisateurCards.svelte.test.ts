import "@gouvfr/dsfr/dist/dsfr.min.css";
import "../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import UtilisateurCards from "./UtilisateurCards.svelte";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await page.viewport(1280, 720);
});

test.each([320, 430])("clipboard rejection keeps long emails readable at %i px", async (width) => {
  await page.viewport(width, 844);
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard denied"));
  const email = "alexandre.dupont@developpement-durable.gouv.fr";
  const { container } = render(UtilisateurCards, {
    utilisateurs: [
      {
        personneId: 1,
        email,
        firstNames: null,
        lastName: null,
        niveau: "retenu",
        groupesInstructeurs: ["DREAL Nouvelle-Aquitaine"],
        actionCount: 42,
        lastActivityDate: null,
      },
    ],
  });
  container.className = "admin-ui p-2";
  const address = page.getByText(email, { exact: true });
  const initialWidth = address.element().getBoundingClientRect().width;
  await page.getByRole("button", { name: `Copier l'adresse e-mail ${email}`, exact: true }).click();
  const error = page.getByText("Copie impossible", { exact: true });
  await expect.element(error).toBeVisible();
  const bounds = address.element().getBoundingClientRect();
  expect(bounds.width).toBeCloseTo(initialWidth, 0);
  expect(error.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.bottom);
  expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
});
