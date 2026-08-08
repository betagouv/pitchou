import { describe, expect, it } from "vitest";

import { parseProjectMapFile } from "./fileImport.ts";

describe("parseProjectMapFile", () => {
  it("parses KML points, lines, and polygons", () => {
    const map = parseProjectMapFile(
      "project.kml",
      `<kml><Document>
        <Point><coordinates>2.35,48.85</coordinates></Point>
        <LineString><coordinates>2,48 3,49</coordinates></LineString>
        <Polygon>
          <outerBoundaryIs><LinearRing><coordinates>2,48 3,48 3,49</coordinates></LinearRing></outerBoundaryIs>
          <innerBoundaryIs><LinearRing><coordinates>2.2,48.2 2.4,48.2 2.4,48.4</coordinates></LinearRing></innerBoundaryIs>
        </Polygon>
      </Document></kml>`,
    );

    expect(map.features.map(({ geometry }) => geometry.type)).toEqual([
      "Point",
      "LineString",
      "Polygon",
    ]);
    expect(map.features[2].geometry.coordinates).toEqual([
      [
        [2, 48],
        [3, 48],
        [3, 49],
        [2, 48],
      ],
      [
        [2.2, 48.2],
        [2.4, 48.2],
        [2.4, 48.4],
        [2.2, 48.2],
      ],
    ]);
  });

  it("parses GPX waypoints and tracks", () => {
    const map = parseProjectMapFile(
      "project.gpx",
      `<gpx><wpt lat="48.85" lon="2.35"></wpt><trk><trkseg>
        <trkpt lon="2" lat="48"></trkpt><trkpt lat="49" lon="3"></trkpt>
      </trkseg></trk></gpx>`,
    );

    expect(map.features.map(({ geometry }) => geometry.type)).toEqual(["Point", "LineString"]);
  });

  it("rejects files without geometry", () => {
    expect(() => parseProjectMapFile("project.kml", "<kml></kml>")).toThrow();
    expect(() => parseProjectMapFile("project.gpx", "<gpx><trk></gpx>")).toThrow();
    expect(() => parseProjectMapFile("project.gpx", `<gpx><wpt lon="2"></wpt></gpx>`)).toThrow();
    expect(() =>
      parseProjectMapFile(
        "project.kml",
        `<kml><Polygon><innerBoundaryIs><LinearRing><coordinates>2,48 3,48 3,49</coordinates></LinearRing></innerBoundaryIs></Polygon></kml>`,
      ),
    ).toThrow();
    expect(() =>
      parseProjectMapFile(
        "project.geojson",
        JSON.stringify({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: null }],
        }),
      ),
    ).toThrow();
  });
});
