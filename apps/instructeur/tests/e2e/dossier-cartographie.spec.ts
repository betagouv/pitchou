import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("la cartographie affiche la carte interactive après ouverture et réouverture", async ({
  page,
  db,
  loginAs,
}) => {
  // Serve a local transparent tile so IGN availability cannot affect map initialization.
  const tile = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route("https://data.geopf.fr/**", (route) =>
    route.fulfill({ contentType: "image/png", body: tile }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { codeAcces, dossier } = await createInstructeurWithDossier(db);
  await db("dossier")
    .where({ id: dossier.id })
    .update({
      projet_map: JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [2, 46],
                  [2.1, 46],
                  [2.1, 46.1],
                  [2, 46],
                ],
              ],
            },
          },
        ],
      }),
    });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}?tab=detail-du-projet`);
  const accordion = page.getByRole("button", { name: "Cartographie du projet", exact: true });
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toHaveCount(0);

  // Reopening also exercises WebGL cleanup and creation of a fresh map.
  for (let opening = 0; opening < 2; opening++) {
    await accordion.click();
    await expect(canvas).toBeVisible();
    await expect(page.locator(".maplibregl-ctrl-zoom-in")).toBeVisible();
    await expect(page.locator(".maplibregl-ctrl-zoom-out")).toBeVisible();
    await expect(page.locator(".maplibregl-ctrl-compass")).toBeVisible();
    await expect(page.getByText(/1\s*zone tracée/u)).toBeVisible();
    await page.locator(".maplibregl-ctrl-zoom-in").click();
    await accordion.click();
    await expect(canvas).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
