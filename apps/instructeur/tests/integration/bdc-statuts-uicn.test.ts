import { expect, test } from "vitest";
import { searchBdcStatut } from "@pitchou/server/bdcStatut.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("BDC exposes the worst national UICN status across synonyms and ignores regional lists", async () => {
  await db("espece_bdc_statut").insert([
    { cd_nom: "1", cd_ref: "1", cd_type_statut: "PN" },
    { cd_nom: "2", cd_ref: "1", cd_type_statut: "LRN", code_statut: "VU" },
    { cd_nom: "1", cd_ref: "1", cd_type_statut: "LRN", code_statut: "CR*" },
    { cd_nom: "3", cd_ref: "3", cd_type_statut: "PN" },
    { cd_nom: "3", cd_ref: "3", cd_type_statut: "LRN", code_statut: "LC" },
    { cd_nom: "3", cd_ref: "3", cd_type_statut: "LRR", code_statut: "CR" },
  ]);
  const result = await searchBdcStatut(
    { text: "", statut: "PN", sort: "cdref", order: "asc", page: 1 },
    db,
  );
  expect(result.rows.map(({ cd_ref, statutListeRouge }) => ({ cd_ref, statutListeRouge }))).toEqual(
    [
      { cd_ref: "1", statutListeRouge: "CR" },
      { cd_ref: "3", statutListeRouge: null },
    ],
  );
  expect(result.total).toBe(2);
});

test("UICN filters match the worst badge before pagination and combine with the other filters", async () => {
  await db("espece_bdc_statut").insert([
    ...Array.from({ length: 25 }, (_, index) => {
      const cd_ref = String(index + 1);
      return [
        { cd_nom: cd_ref, cd_ref, cd_type_statut: "PN" },
        { cd_nom: cd_ref, cd_ref, cd_type_statut: "LRN", code_statut: index === 0 ? "CR*" : "CR" },
      ];
    }).flat(),
    { cd_nom: "26", cd_ref: "26", cd_type_statut: "PN" },
    { cd_nom: "26", cd_ref: "26", cd_type_statut: "LRN", code_statut: "VU" },
    { cd_nom: "126", cd_ref: "26", cd_type_statut: "LRN", code_statut: "EN" },
    { cd_nom: "27", cd_ref: "27", cd_type_statut: "PN" },
    { cd_nom: "27", cd_ref: "27", cd_type_statut: "LRR", code_statut: "CR" },
    { cd_nom: "28", cd_ref: "28", cd_type_statut: "PN" },
    { cd_nom: "28", cd_ref: "28", cd_type_statut: "LRN", code_statut: "VU" },
  ]);
  async function search(uicn: string, page = 1, text = "") {
    const params = new URLSearchParams({ statut: "PN", uicn, page: String(page), q: text });
    const response = await fetch(`${INTEGRATION_BASE_URL}/api/bdc-statuts?${params}`);
    expect(response.status).toBe(200);
    return response.json();
  }
  const critical = await search("CR", 2);
  expect(critical.total).toBe(25);
  expect(critical.rows).toHaveLength(5);
  expect(critical.rows.map((row: { cd_ref: string }) => row.cd_ref)).toEqual([
    "21",
    "22",
    "23",
    "24",
    "25",
  ]);
  const vulnerable = await search("VU");
  expect(vulnerable.total).toBe(1);
  expect(vulnerable.rows[0]).toMatchObject({ cd_ref: "28", statutListeRouge: "VU" });
  const endangered = await search("EN", 1, "26");
  expect(endangered.total).toBe(1);
  expect(endangered.rows[0]).toMatchObject({ cd_ref: "26", statutListeRouge: "EN" });
  expect((await search("CR", 1, "26")).total).toBe(0);
  expect((await search("invalid")).total).toBe(28);
});
