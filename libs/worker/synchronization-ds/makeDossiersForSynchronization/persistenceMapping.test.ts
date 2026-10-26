import { expect, test, vi } from "vitest";
import { decryptDossiersAdditionalData } from "@pitchou/server/demarche-numerique/encryptDecryptDossiersAdditionalData.ts";
import { makeChampsDossierForInitialization } from "./persistenceMapping.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";

vi.mock("@pitchou/server/demarche-numerique/encryptDecryptDossiersAdditionalData.ts", () => ({
  decryptDossiersAdditionalData: vi.fn(),
}));

test.each([
  [{ depot_date: null, ddep_depot_date: "2025-03-15" }, null],
  [{ ddep_depot_date: "2025-03-15" }, "2026-07-15"],
  [{ depot_date: "2024-01-15" }, "2024-01-15"],
])(
  "preserves explicit unknown and historical deposits when initializing from DN: %j",
  async (additional, expected) => {
    vi.mocked(decryptDossiersAdditionalData).mockResolvedValue(
      JSON.stringify({ dossier: additional }),
    );
    const input = {
      number: 42,
      dateDepot: "2026-07-15",
      champs: [
        {
          label: "NE PAS MODIFIER - Données techniques associées à votre dossier",
          stringValue: "encrypted",
        },
      ],
    } as unknown as DossierDS88444;
    const result = await makeChampsDossierForInitialization(
      input,
      88444,
      new Map(),
      new Map(),
      () => ({}),
    );
    expect(result.dossier.depot_date).toBe(expected);
    expect(result.dossier.ddep_depot_date).toBeNull();
  },
);
