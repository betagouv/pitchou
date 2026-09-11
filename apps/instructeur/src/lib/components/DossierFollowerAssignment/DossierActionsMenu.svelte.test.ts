import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import DossierActionsMenu from "./DossierActionsMenu.svelte";
import { fakeDossierFull } from "../../../routes/fakeDossier.ts";

vi.mock("$lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));

afterEach(cleanup);

const props = { dossierId: fakeDossierFull().id, dossierName: "Dossier test" };

test("all menu icons download SVG masks and paint blue glyphs, not solid rectangles", async () => {
  const { container } = render(DossierActionsMenu, {
    ...props,
    extraItems: [
      { label: "Ajouter une pièce jointe", icon: "fr-icon-attachment-line", onClick: vi.fn() },
      { label: "Voir le dossier en lecture seule", icon: "fr-icon-eye-line", onClick: vi.fn() },
    ],
  });
  container.style.padding = "32px";
  container.style.display = "flex";
  container.style.justifyContent = "flex-end";
  await userEvent.click(screen.getByRole("button", { name: /Plus d’actions/ }));
  await document.fonts.ready;
  for (const [index, name] of [
    "share-forward-fill",
    "calendar-event-line",
    "attachment-line",
    "eye-line",
  ].entries()) {
    const item = screen.getAllByRole("menuitem")[index];
    const glyph = item.querySelector(`.fr-icon-${name}`)!;
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(item.querySelector("svg")).toBeNull();
    const style = getComputedStyle(glyph, "::before");
    expect(style.maskImage).toMatch(/^url\("/);
    expect(style.color).toBe("rgb(0, 0, 145)");
    expect([style.width, style.height]).toEqual(["24px", "24px"]);
    const url = style.maskImage.match(/^url\("(.+)"\)$/)![1];
    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    const image = new Image();
    image.src = `data:image/png;base64,${await page.screenshot({ element: glyph, save: false })}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let bluePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 2] > pixels[i] + 30 && pixels[i + 2] > pixels[i + 1] + 30) bluePixels++;
    }
    expect(bluePixels).toBeGreaterThan(image.width * image.height * 0.05);
    expect(bluePixels).toBeLessThan(image.width * image.height * 0.8);
  }
});

test("keyboard opens on the first item, navigates all entries and restores focus on Escape", async () => {
  const onClick = vi.fn();
  const { rerender } = render(DossierActionsMenu, {
    ...props,
    extraItems: [{ label: "Sans icône", onClick }],
  });
  const trigger = screen.getByRole("button", { name: /Plus d’actions/ });
  trigger.focus();
  await userEvent.keyboard("{ArrowDown}");
  const items = screen.getAllByRole("menuitem");
  expect(items[0]).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menu").id).toBe(trigger.getAttribute("aria-controls"));
  for (const [key, index] of [
    ["ArrowDown", 1],
    ["End", 2],
    ["ArrowDown", 0],
    ["ArrowUp", 2],
    ["Home", 0],
  ] as const) {
    await userEvent.keyboard(`{${key}}`);
    expect(items[index]).toHaveFocus();
  }
  expect(items[2].querySelector("span")).toBeNull();
  await userEvent.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("menu")).toBeNull();
  await userEvent.keyboard("{Enter}{End}{Enter}");
  expect(onClick).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).toBeNull();
  await rerender({ ...props, showDeadline: false });
  await userEvent.click(trigger);
  expect(screen.queryByRole("menuitem", { name: /Modifier la date/ })).toBeNull();
  await userEvent.tab();
  expect(screen.queryByRole("menu")).toBeNull();
  await userEvent.click(trigger);
  await userEvent.click(document.body, { position: { x: 100, y: 300 } });
  expect(screen.queryByRole("menu")).toBeNull();
});

test.each(["Faire suivre le dossier", "Modifier la date de la prochaine échéance"])(
  "%s still opens its dialog and restores trigger focus on close",
  async (label) => {
    render(DossierActionsMenu, props);
    const trigger = screen.getByRole("button", { name: /Plus d’actions/ });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: label }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: label })).toBeVisible());
    expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);
