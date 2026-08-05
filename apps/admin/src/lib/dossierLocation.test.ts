import { describe, expect, it } from "vitest";

import { communeDepartmentCode } from "./dossierLocation.ts";

describe("communeDepartmentCode", () => {
  it("derives mainland, Corsican, and overseas department codes", () => {
    expect(communeDepartmentCode({ code: "75056" })).toBe("75");
    expect(communeDepartmentCode({ code: "2A004" })).toBe("2A");
    expect(communeDepartmentCode({ code: "97105" })).toBe("971");
  });

  it("prefers department metadata returned by the commune API", () => {
    expect(communeDepartmentCode({ code: "75056", departmentCode: "01" })).toBe("01");
  });
});
