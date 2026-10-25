import { describe, expect, it } from "vitest";
import { parseRecordIds } from "./selection.ts";

describe("manual Onagre selection", () => {
  it("accepts pasted IDs separated by newlines, commas or semicolons and removes duplicates", () => {
    expect(parseRecordIds(" 12, 34;12\n56 ")).toEqual({
      recordIds: ["12", "34", "56"],
      error: null,
    });
  });

  it.each(["", "12.5", "1e3", "-12", "#12", "012", "ONAGRE-123", "2147483648", "12345678901"])(
    "refuses an empty selection or an ambiguous internal ID: %s",
    (input) => expect(parseRecordIds(input).error).not.toBeNull(),
  );

  it("counts distinct IDs when enforcing the ten-demande limit", () => {
    const ten = Array.from({ length: 10 }, (_, i) => String(i + 1)).join(" ");
    expect(parseRecordIds(`${ten} 1`).error).toBeNull();
    expect(parseRecordIds(`${ten} 11`).error).not.toBeNull();
  });
});
