import { randomUUID } from "node:crypto";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier } from "../factories/index.ts";
import { prepareDossierFiles } from "../../../../libs/worker/synchronization-ds/synchronizeDossierFiles.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

test("preparation skips stored imports per dossier and file, retaining shared and missing imports", async () => {
  // No storage objects exist. Unprepared files return a media-type anomaly if read.
  const files = await db("file")
    .insert([
      { id: randomUUID(), size: "0", name: "stable", media_type: "text/plain" },
      { id: randomUUID(), size: "0", name: "changed", media_type: "text/plain" },
      { id: randomUUID(), size: "0", name: "shared", media_type: "text/plain" },
      { id: randomUUID(), size: "0", name: "missing", media_type: "text/plain" },
    ])
    .returning("id");
  const [stable, changed, shared, missing] = files.map(({ id }) => id as FileId);
  const dossiers: Awaited<ReturnType<typeof createDossier>>[] = [];
  for (const [number, file] of [
    [101, stable],
    [102, stable],
    [103, shared],
    [104, shared],
    [105, missing],
  ] as const) {
    dossiers.push(
      await createDossier(db, {
        demarche_numerique_number: String(number),
        especes_impactees: file,
      }),
    );
  }
  await db("impact_espece").insert(
    [stable, stable, shared].map((file, index) => ({
      dossier: dossiers[index].id,
      source_file: file,
      cd_ref: "2437",
      classification: "oiseau",
    })),
  );
  await db.transaction(async (trx) => {
    const prepared = await prepareDossierFiles(
      {
        especesImpactees: Promise.resolve(
          new Map([
            [101, stable],
            [102, changed],
            [103, shared],
            [104, shared],
            [105, missing],
          ]),
        ),
        piecesJointesPetitionnaire: Promise.resolve(new Map()),
      },
      trx,
    );
    expect([...prepared.preparedFiles.keys()]).toEqual([changed, shared, missing]);
    expect(prepared.especesImpactees?.get(101)).toBe(stable);
    expect(
      await synchronizeFichiersEspecesImpacteesFromDS88444(
        new Map([[101, stable]]),
        new Map([[101, dossiers[0].id as DossierId]]),
        trx,
        prepared.preparedFiles,
      ),
    ).toEqual(new Set());
  });
  expect(await db("impact_espece")).toHaveLength(3);
  expect(await db("action_dossier")).toHaveLength(0);
});
