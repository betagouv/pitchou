import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("GET /api/especes-protegees renvoie publiquement les lignes fusionnées en JSON", async () => {
  // Reference layer (via the source tables + reference rebuild): no flags here.
  await seedEspeceProtegeeReference(
    [
      {
        cd_ref: "2437",
        classification: "oiseau",
        noms_scientifiques: ["Morus bassanus", "Sula bassana"],
        noms_vernaculaires: ["Fou de Bassan"],
        cd_type_statuts: ["PN"],
      },
    ],
    db,
  );
  // Manual layer: the ministérielle flag lives here and surfaces through the view.
  await db("espece_protegee_modification").insert({
    cd_ref: "2437",
    espece_ministerielle: true,
  });

  // No auth header: the endpoint is intentionally public.
  const res = await fetch(`${INTEGRATION_BASE_URL}/api/especes-protegees`);

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);

  const espece = body.find((e: { cd_ref: string }) => e.cd_ref === "2437");
  expect(espece).toBeDefined();
  // The contract the front-end relies on: raw rows, arrays (not Sets) after JSON.
  expect(espece.noms_scientifiques).toEqual(["Morus bassanus", "Sula bassana"]);
  expect(espece.noms_vernaculaires).toEqual(["Fou de Bassan"]);
  expect(espece.cd_type_statuts).toEqual(["PN"]);
  // Flags come from the manual layer, merged by the view.
  expect(espece.espece_ministerielle).toBe(true);
  expect(espece.espece_cnpn).toBe(false);
});
