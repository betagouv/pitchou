import { Readable } from "node:stream";
import knex from "knex";
import { expect, test, vi } from "vitest";
import { getDossiersForGeoMCE } from "./geomce_dossiers.ts";
import { getObject } from "../objectStorage.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

vi.mock("../especeProtegee.ts", () => ({
  loadEspeceByCD_REF: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("../referentielTypeImpactMethodeMoyenDePoursuite.ts", () => ({
  getReferentielTypeImpactMethodeMoyenDePoursuite: vi.fn().mockResolvedValue({}),
}));
vi.mock("../objectStorage.ts", () => ({
  fileKey: (id: string) => `files/${id}`,
  getObject: vi.fn(),
}));

test("reads GeoMCE SQL sequentially before concurrent object downloads", async () => {
  const db = knex({ client: "pg" });
  let queryRunning = false;
  let downloadsRunning = 0;
  let maxDownloadsRunning = 0;
  const queries: string[] = [];
  const dossiers = [1, 2].map((id) => ({ id, especes_impactees: `file-${id}` }));
  db.client.acquireConnection = async () => ({
    query(
      { text: sql }: { text: string },
      callback: (error: Error | null, result?: object) => void,
    ) {
      if (queryRunning) return callback(new Error("concurrent transaction query"));
      queryRunning = true;
      queries.push(sql);
      const rows = sql.includes('from "dossier"')
        ? dossiers
        : sql.includes('from "file"')
          ? dossiers.map(({ especes_impactees }) => ({
              id: especes_impactees,
              media_type: "application/pdf",
            }))
          : [];
      queueMicrotask(() => {
        queryRunning = false;
        callback(null, { rows, rowCount: rows.length, command: "SELECT" });
      });
    },
  });
  db.client.releaseConnection = async () => {};
  vi.mocked(getObject).mockImplementation(async () => {
    expect(queryRunning).toBe(false);
    expect(queries.at(-1)).toContain('from "file"');
    downloadsRunning += 1;
    maxDownloadsRunning = Math.max(maxDownloadsRunning, downloadsRunning);
    await Promise.resolve();
    downloadsRunning -= 1;
    return { body: Readable.from("file") };
  });
  try {
    const results = await getDossiersForGeoMCE([1, 2] as DossierId[], db);
    expect(results?.map(({ id }) => id)).toEqual([1, 2]);
    expect(queries).toHaveLength(3);
    expect(getObject).toHaveBeenCalledWith("files/file-1");
    expect(getObject).toHaveBeenCalledWith("files/file-2");
    expect(maxDownloadsRunning).toBe(2);
  } finally {
    await db.destroy();
    vi.clearAllMocks();
  }
});
