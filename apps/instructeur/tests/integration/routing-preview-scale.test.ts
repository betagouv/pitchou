import { expect, test } from "vitest";
import type { GroupPreview, GroupPreviewPage } from "@pitchou/types/groupRouting.ts";
import { db } from "../setup/db.ts";
import { admin } from "../helpers/administration.ts";
import { pageQuery, postPreview, previewRule } from "../helpers/routingPreview.ts";

// Opt in only when the parent has coordinated an isolated integration database.
// The normal integration setup owns database creation, migrations and cleanup.
test.skipIf(process.env.PITCHOU_RUN_PREVIEW_SCALE !== "1")(
  "measure 20k synthetic dossiers with bounded initial and page payloads",
  async () => {
    const actor = await admin();
    await db.raw(`INSERT INTO dossier(name, primary_department, source, demarche_number)
      SELECT 'Synthetic dossier ' || n, '75', 'demarche_numerique', 88444
      FROM generate_series(1, 20000) n`);
    const input = { name: "Scale", active: true, members: [], rules: [previewRule("75")] };
    const timings: { request: string; milliseconds: number; bytes: number }[] = [];
    const initialStart = performance.now();
    const initialResponse = await postPreview(actor.token, input);
    expect(initialResponse.status).toBe(200);
    const initialText = await initialResponse.text();
    timings.push({
      request: "initial",
      milliseconds: performance.now() - initialStart,
      bytes: Buffer.byteLength(initialText),
    });
    const initial: GroupPreview = JSON.parse(initialText);
    expect(initial.added.count).toBe(20_000);
    expect(initial.added.dossiers).toHaveLength(25);
    for (const page of [2, 800]) {
      const start = performance.now();
      const response = await postPreview(
        actor.token,
        input,
        pageQuery(initial.token, "added", page),
      );
      expect(response.status).toBe(200);
      const text = await response.text();
      timings.push({
        request: `page ${page}`,
        milliseconds: performance.now() - start,
        bytes: Buffer.byteLength(text),
      });
      const result: GroupPreviewPage = JSON.parse(text);
      expect(result).toMatchObject({ token: initial.token, count: 20_000, page, pageSize: 25 });
      expect(result.dossiers).toHaveLength(25);
      expect(result.dossiers.map((d) => d.id)).toEqual(
        Array.from({ length: 25 }, (_, index) => (page - 1) * 25 + index + 1),
      );
    }
    expect(timings.every((timing) => timing.bytes < 5000)).toBe(true);
    expect(await db("groupe_instructeurs")).toHaveLength(0);
    expect(await db("edge_groupe_instructeurs__dossier")).toHaveLength(0);
    expect(await db("administration_event")).toHaveLength(0);
    console.info("Group preview 20k scale measurements", JSON.stringify(timings));
  },
  120_000,
);
