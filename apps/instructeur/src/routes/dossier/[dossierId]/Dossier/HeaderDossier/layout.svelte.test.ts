import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import "@gouvfr/dsfr/dist/dsfr.module.js";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import Dossier from "../../Dossier.svelte";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import { store } from "$lib/state/store.svelte.ts";

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_PITCHOU_ENV: "" } }));
vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  sendEvenement: vi.fn(),
}));
vi.mock(import("$lib/especes/activitesMethodesMoyensDePoursuite.ts"), () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn().mockReturnValue(new Promise(() => {})),
  loadEspecesProtegeesList: vi.fn().mockReturnValue(new Promise(() => {})),
}));

afterEach(() => {
  cleanup();
  document.querySelector("#layout-test")?.remove();
  store.capabilities = {};
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
  window.scrollTo(0, 0);
});

function expectNoOverflow() {
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
  const header = document.querySelector("header")!;
  expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  const sticky = screen.queryByTestId("sticky-dossier-header");
  if (sticky) expect(sticky.scrollWidth).toBeLessThanOrEqual(sticky.clientWidth);
}

async function scrollTo(y: number) {
  window.scrollTo({ top: y, behavior: "instant" });
  await waitFor(() => expect(window.scrollY).toBe(y));
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
}

test.each([390, 1024, 1440])(
  "dossier layout at %ipx has no overflow, full-bleed panels and a real sticky header",
  async (width) => {
    await page.viewport(width, 900);
    const target = document.createElement("div");
    target.id = "layout-test";
    target.className = "pitchou-container";
    // Stand in for the site header and footer, leaving enough document to scroll.
    target.style.paddingTop = "240px";
    target.style.paddingBottom = "1000px";
    document.body.append(target);
    const dossier = fakeDossierFull({
      name: "Restauration des ouvrages et protection des espèces sur le territoire communal "
        .repeat(6)
        .trim(),
      enjeu: true,
    });
    store.capabilities = { modifierDossier: vi.fn().mockResolvedValue(undefined) };
    render(Dossier, {
      target,
      props: {
        dossier,
        activeTab: "instruction",
        onTabChange: vi.fn(),
        email: "instructeur@example.com",
        dossierFollowers: ["une.instructrice.avec.un.nom.particulierement.long@example.com"],
        currentDossierFollowedByCurrentInstructeur: true,
        readOnly: false,
        onReadOnlyChange: vi.fn(),
        canEdit: true,
        onClose: vi.fn(),
      },
    });
    await document.fonts.ready;
    await waitFor(() =>
      expect(screen.getByRole("tabpanel", { name: "Instruction" })).toBeVisible(),
    );
    const header = target.querySelector("header")!;
    const title = screen.getByRole("heading", { level: 2, name: dossier.name! });
    expect(title.tagName).toBe("H2");
    expect(getComputedStyle(title).fontSize).toBe(width < 768 ? "28px" : "32px");
    expect(getComputedStyle(document.body).backgroundColor).toBe("rgb(246, 246, 246)");
    expectNoOverflow();

    await fireEvent.input(screen.getByLabelText("N° de dossier Onagre"), {
      target: { value: `ONAGRE-${width}` },
    });
    await waitFor(() => expect(screen.getAllByText("Dossier mis à jour")).toHaveLength(1), {
      timeout: 2500,
    });
    expectNoOverflow();
    const savedTag = within(header).getByText("Dossier mis à jour");
    const enjeuTag = within(header).getByText("Dossier à enjeu");
    expect(savedTag.parentElement!.parentElement).toBe(enjeuTag.parentElement);
    const savedBounds = savedTag.getBoundingClientRect();
    expect(Math.abs(savedBounds.right - header.getBoundingClientRect().right)).toBeLessThan(1);
    if (width >= 1024) {
      const enjeuBounds = enjeuTag.getBoundingClientRect();
      expect(
        Math.abs(
          savedBounds.top + savedBounds.height / 2 - enjeuBounds.top - enjeuBounds.height / 2,
        ),
      ).toBeLessThan(1);
    }

    await scrollTo(340);
    expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();
    await scrollTo(341);
    expect(header.getBoundingClientRect().bottom).toBeGreaterThan(0);
    expect(screen.queryByTestId("sticky-dossier-header")).toBeNull();

    const headerBottom = Math.ceil(header.getBoundingClientRect().bottom + window.scrollY);
    await scrollTo(headerBottom + 1);
    await waitFor(() => expect(screen.getByTestId("sticky-dossier-header")).toBeVisible());
    expect(header.getBoundingClientRect().bottom).toBeLessThan(0);
    expectNoOverflow();
    const sticky = screen.getByTestId("sticky-dossier-header");
    expect(sticky.getBoundingClientRect().width).toBe(width);
    const gutter = width >= 1296 ? (width - 1248) / 2 + 24 : width >= 992 ? 24 : 16;
    const icon = sticky.querySelector("img")!.getBoundingClientRect();
    expect(icon.left).toBe(gutter);
    expect(icon.width).toBe(40);
    expect(icon.height).toBe(40);
    expect(header.getBoundingClientRect().left).toBe(gutter);
    const compactTitle = sticky.querySelector(".compact-title")!;
    expect(getComputedStyle(compactTitle).whiteSpace).toBe("nowrap");
    expect(getComputedStyle(compactTitle).textOverflow).toBe("ellipsis");

    expect(screen.getAllByText("Dossier mis à jour")).toHaveLength(2);
    expectNoOverflow();

    // Sample actual painted pixels at both viewport edges, below the tab list.
    const image = new Image();
    image.src = `data:image/png;base64,${await page.screenshot({ save: false })}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    // Vitest screenshots the full document inside a scaled iframe.
    const y = Math.round(((window.scrollY + 200) * image.width) / width);
    for (const x of [1, image.width - 2]) {
      expect(Array.from(context.getImageData(x, y, 1, 1).data)).toEqual([255, 255, 255, 255]);
    }
    await waitFor(() => expect(screen.queryByText("Dossier mis à jour")).toBeNull(), {
      timeout: 4000,
    });
    expectNoOverflow();
    await scrollTo(Math.floor(header.getBoundingClientRect().bottom + window.scrollY) - 10);
    await waitFor(() => expect(screen.queryByTestId("sticky-dossier-header")).toBeNull());
    expect(window.scrollY).toBeGreaterThan(340);
    expect(header.getBoundingClientRect().bottom).toBeGreaterThan(0);
  },
  15000,
);
