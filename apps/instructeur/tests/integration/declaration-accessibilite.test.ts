import { expect, test } from "vitest";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

const DECLARATION_PATH = "/declaration-accessibilite_2025-07-07.html";

test("GET /declaration-accessibilite_*.html sert la déclaration d'accessibilité", async () => {
  const res = await fetch(`${INTEGRATION_BASE_URL}${DECLARATION_PATH}`);

  expect(res.status).toBe(200);

  const body = await res.text();
  expect(body).toMatch(/Déclaration d.accessibilité/);
});
