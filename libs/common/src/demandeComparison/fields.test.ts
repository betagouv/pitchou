import { expect, test } from "vitest";
import { compareDemandes } from "../demandeComparison.ts";
import { fileField } from "./fields.ts";
import type { ComparisonRecord } from "@pitchou/types/demandeComparison.ts";
function document(item: ComparisonRecord) {
  return { sections: [{ key: "avis", label: "Avis", records: [item] }] };
}
test("detects replacement bytes even when the document keeps the same name", () => {
  const before: ComparisonRecord = {
    key: "avis",
    label: "Avis",
    identity: "1:a",
    fields: [
      fileField(
        "file",
        "Document",
        undefined,
        "/avis-expert/fichier/11111111-1111-4111-8111-111111111111",
      ),
    ],
  };
  const after = {
    ...before,
    fields: [
      fileField(
        "file",
        "Document",
        undefined,
        "/avis-expert/fichier/22222222-2222-4222-8222-222222222222",
      ),
    ],
  };
  expect(compareDemandes(document(before), document(after))).toMatchObject([
    {
      kind: "changed",
      left: "Document joint",
      right: "Document joint",
      detail: "Le document associé a changé.",
    },
  ]);
});
