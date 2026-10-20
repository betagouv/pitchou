import { describe, expect, it } from "vitest";

import { parseMapCoordinates } from "./coordinates.ts";

describe("parseMapCoordinates", () => {
  it("parses latitude/longitude in decimal degrees", () => {
    expect(parseMapCoordinates("48.8566, 2.3522")).toEqual([2.3522, 48.8566]);
  });

  it("parses latitude/longitude in degrees, minutes, and seconds", () => {
    const position = parseMapCoordinates(`43°48'06"N 006°14'59"E`);
    expect(position?.[0]).toBeCloseTo(6.2497, 3);
    expect(position?.[1]).toBeCloseTo(43.8017, 3);
  });

  it("rejects invalid coordinates", () => {
    expect(parseMapCoordinates("95, 200")).toBeNull();
    expect(parseMapCoordinates(`99°99'99"N 199°99'99"E`)).toBeNull();
    expect(parseMapCoordinates("somewhere")).toBeNull();
  });

  it("accepts lowercase compass directions", () => {
    expect(parseMapCoordinates(`43°00'00"s 006°00'00"w`)).toEqual([-6, -43]);
  });

  it("rejects Unicode lookalikes for compass directions", () => {
    expect(parseMapCoordinates(`43°00'00"ſ 006°00'00"E`)).toBeNull();
  });
});
