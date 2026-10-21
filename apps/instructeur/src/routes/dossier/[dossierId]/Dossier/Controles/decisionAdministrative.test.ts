import { beforeEach, expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createOdsFile } from "@odfjs/odfjs";

vi.mock("./prescriptions.ts", () => ({ addPrescriptionsAndControles: vi.fn() }));
vi.mock("#lib/dossier/dossier.ts", () => ({ refreshDossierFull: vi.fn() }));
vi.mock("#lib/state/store.svelte.ts", () => ({ store: { capabilities: {} } }));

import { createPrescriptionControlesFromFichier } from "./decisionAdministrative.ts";
import { addPrescriptionsAndControles } from "./prescriptions.ts";
import { SurfaceConversionRequired } from "./decisionAdministrative/errors.ts";
import type { FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

const decision = { id: "decision-1", number: "987654321" } as FrontEndDecisionAdministrative;
const importFile = (file: ArrayBuffer) => createPrescriptionControlesFromFichier(file, decision);

function ods(rows: (string | number)[][]) {
  return createOdsFile(
    new Map([
      [
        "Prescriptions",
        rows.map((row) =>
          row.map((value) => ({
            value,
            type: typeof value === "number" ? ("float" as const) : ("string" as const),
          })),
        ),
      ],
    ]),
  );
}

beforeEach(() => {
  vi.mocked(addPrescriptionsAndControles).mockReset().mockResolvedValue(undefined);
});

test("imports the distributed template", async () => {
  const file = await readFile("../../data/modèles/modèle ajout prescriptions.ods");
  expect(await importFile(Uint8Array.from(file).buffer)).toBe(1);
  expect(addPrescriptionsAndControles).toHaveBeenCalledWith([
    expect.objectContaining({
      article_number: "1.2",
      description: "desc",
      compensated_surface: 100,
    }),
  ]);
});

test("accepts numeric decision and article numbers and keeps matching or unnumbered rows", async () => {
  expect(
    await importFile(
      await ods([
        ["Numéro décision administrative", "Numéro article", "Description"],
        [987654321, 2, "Numeric decision"],
        [" 987654321 ", "3", "Text decision"],
        ["", "4", "Unnumbered decision"],
        ["other", "5", "Other decision"],
      ]),
    ),
  ).toBe(3);
  expect(addPrescriptionsAndControles).toHaveBeenCalledWith([
    expect.objectContaining({ article_number: "2", description: "Numeric decision" }),
    expect.objectContaining({ article_number: "3" }),
    expect.objectContaining({ article_number: "4" }),
  ]);
});

test.each([
  { rows: [["Description"]], message: "ne contient aucune prescription" },
  { rows: [["Wrong header"], ["value"]], message: "Aucune colonne de prescription reconnue" },
  {
    rows: [
      ["Numéro décision administrative", "Description"],
      ["other", "value"],
    ],
    message: "Aucune prescription ne correspond",
  },
])("rejects unusable files without saving: $message", async ({ rows, message }) => {
  await expect(importFile(await ods(rows))).rejects.toThrow(message);
  expect(addPrescriptionsAndControles).not.toHaveBeenCalled();
});

test("reports an invalid ODS file", async () => {
  await expect(importFile(new ArrayBuffer(0))).rejects.toThrow("tableur ODS valide");
  expect(addPrescriptionsAndControles).not.toHaveBeenCalled();
});

test("propagates a failed save", async () => {
  vi.mocked(addPrescriptionsAndControles).mockRejectedValue(new Error("Save failed"));
  await expect(importFile(await ods([["Description"], ["value"]]))).rejects.toThrow("Save failed");
});

test("requires acceptance of the exact hectare conversions before saving", async () => {
  const file = await ods([["Surface compensée"], ["2,4 ha"]]);
  const conversions = [
    { prescription: 1, column: "Surface compensée", original: "2,4 ha", squareMetres: 24000 },
  ];
  await expect(importFile(file)).rejects.toBeInstanceOf(SurfaceConversionRequired);
  expect(addPrescriptionsAndControles).not.toHaveBeenCalled();
  await expect(
    createPrescriptionControlesFromFichier(file, decision, [
      { ...conversions[0], squareMetres: 2400 },
    ]),
  ).rejects.toBeInstanceOf(SurfaceConversionRequired);
  expect(addPrescriptionsAndControles).not.toHaveBeenCalled();
  expect(await createPrescriptionControlesFromFichier(file, decision, conversions)).toBe(1);
  expect(addPrescriptionsAndControles).toHaveBeenCalledWith([
    expect.objectContaining({ compensated_surface: 24000 }),
  ]);
});

test("rejects the entire batch before saving when a quantity is invalid", async () => {
  await expect(
    importFile(await ods([["Individus compensés"], [2], ["plusieurs"]])),
  ).rejects.toThrow('Prescription 2, colonne "Individus compensés"');
  expect(addPrescriptionsAndControles).not.toHaveBeenCalled();
});
