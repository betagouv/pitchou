// Run from apps/instructeur: node --test tests/layout/dossier-footer.test.mjs
// Real Dossier, tab list, footer, app CSS and shipped DSFR CSS/JS; no API or database.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const fixture = fileURLToPath(new URL("../fixtures/dossier-footer/", import.meta.url));
const path = "/apps/instructeur/tests/fixtures/dossier-footer/index.html";
let server;
let browser;
let url;

before(async () => {
  server = await createServer({
    root,
    configFile: false,
    server: { host: "127.0.0.1", port: 0 },
    plugins: [
      {
        name: "dossier-layout-stubs",
        enforce: "pre",
        resolveId(source, importer) {
          if (!importer?.endsWith("/Dossier.svelte")) return;
          if (source.endsWith(".svelte") && !source.endsWith("/DossierTabList.svelte")) {
            return `${fixture}${/Dossier(Instruction|DetailProjet)\.svelte$/.test(source) ? "Panel" : "Empty"}.svelte`;
          }
          if (source.endsWith("/aarri.ts")) return "\0layout:analytics";
          if (source.endsWith("/anomaliesFichierEspeces.ts")) return "\0layout:anomalies";
        },
        load(id) {
          if (id === "\0layout:analytics") return "export const sendEvenement = () => {};";
          if (id === "\0layout:anomalies")
            return "export const anomaliesFichierEspeces = () => undefined;";
        },
      },
      svelte({ configFile: false }),
      tailwindcss(),
    ],
  });
  await server.listen();
  url = `http://127.0.0.1:${server.httpServer.address().port}${path}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function pixels(page, points) {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(
    async ({ png, points }) => {
      const image = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${png}`)).blob(),
      );
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3));
    },
    { png, points },
  );
}

async function footerPixels(page, width, above = [255, 255, 255]) {
  await page.locator("#footer").evaluate((footer) => window.scrollTo(0, footer.offsetTop - 160));
  const { y } = await page.locator("#footer").boundingBox();
  const xs = [1, 16, Math.floor(width / 2), width - 17, width - 2];
  const colors = await pixels(
    page,
    xs.flatMap((x) => [
      [x, Math.round(y) - 4],
      [x, Math.round(y)],
    ]),
  );
  for (let i = 0; i < xs.length; i++) {
    assert.deepEqual(colors[2 * i], above, `background above footer at x=${xs[i]}`);
    assert.deepEqual(colors[2 * i + 1], [0, 0, 145], `blue divider at x=${xs[i]}`);
  }
}

for (const width of [1440, 390]) {
  test(`dossier footer, retained forms and viewport dialog at ${width}px`, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(url);
      await page.waitForFunction(
        () => window.dsfr?.(document.querySelector(".fr-tabs"))?.tabsGroup,
      );
      const input = page.locator("#tabpanel-instruction-panel input");
      await input.fill("Retained draft");
      await input.evaluate((element) => (window.originalDraftInput = element));
      await footerPixels(page, width);

      const firstTab = page.getByRole("tab", { name: "Instruction", exact: true });
      await firstTab.focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        () =>
          document.querySelector("#tabpanel-detail-du-projet").getAttribute("aria-selected") ===
          "true",
      );
      await footerPixels(page, width);
      await firstTab.click();
      assert.equal(await input.inputValue(), "Retained draft");
      assert.equal(await input.evaluate((element) => element === window.originalDraftInput), true);
      assert.equal(await page.getByRole("tabpanel").count(), 1);
      await footerPixels(page, width);

      await page.getByRole("tab", { name: "Avis", exact: false }).click();
      await footerPixels(page, width);
      await firstTab.click();
      await footerPixels(page, width);

      // Open via DSFR without scrolling the footer away from the screenshot.
      await page
        .locator("#tabpanel-instruction-panel dialog")
        .evaluate((dialog) => window.dsfr(dialog).modal.disclose());
      await page.waitForFunction(() => {
        const dialog = document.querySelector("dialog.fr-modal--opened");
        return dialog && getComputedStyle(dialog).opacity === "1";
      });
      const dialog = page.getByRole("dialog");
      assert.deepEqual(await dialog.boundingBox(), { x: 0, y: 0, width, height: 900 });
      const { y } = await page.locator("#footer").boundingBox();
      const colors = await pixels(page, [
        [1, Math.round(y) - 4],
        [width - 2, Math.round(y) - 4],
        [1, Math.round(y)],
        [width - 2, Math.round(y)],
      ]);
      // DSFR's rgba(22, 22, 22, .64) overlay over white and the blue divider.
      assert.deepEqual(colors, [
        [106, 106, 106],
        [106, 106, 106],
        [14, 14, 66],
        [14, 14, 66],
      ]);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  for (const mode of ["list", "public"]) {
    test(`${mode} footer retains its grey margin at ${width}px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.goto(`${url}?mode=${mode}`);
        await page.locator("#footer").waitFor();
        assert.equal(
          await page.locator("#footer").evaluate((footer) => getComputedStyle(footer).marginTop),
          "16px",
        );
        await footerPixels(page, width, [246, 246, 246]);
      } finally {
        await page.close();
      }
    });
  }
}
