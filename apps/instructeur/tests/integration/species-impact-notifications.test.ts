import { expect, test } from "vitest";
import type { Knex } from "knex";
import {
  ods,
  type Cellule,
} from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.fixture.ts";
import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import { dumpImpactEspeceFromFichier } from "@pitchou/server/database/impact_espece/dumpImpactEspeceFromFichier.ts";
import { getDossierReviewSnapshot } from "@pitchou/server/database/notification/snapshot.ts";
import {
  getNotificationsForPersonneFromCap,
  updateNotificationDossierFromCap,
} from "@pitchou/server/database/notification.ts";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import {
  attachCapToGroupe,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
  createFichierS3,
} from "../factories/index.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const capture = speciesImpactChangeField("P-2-1");
const habitat = speciesImpactChangeField("P-4-2");
const initial: Cellule[][] = [
  ["2437", "P-2-1", "1-10", ""],
  ["2437", "P-4-2", "", 100],
];

async function speciesFile(rows: Cellule[][]) {
  return createFichierS3(db, await getTestS3(), {
    name: "species.ods",
    mediaType: "application/vnd.oasis.opendocument.spreadsheet",
    bytes: Buffer.from(
      await ods(
        ["CD_REF", "identifiant pitchou activité", "nombre individus", "surface habitat détruit"],
        rows,
      ),
    ),
  });
}

async function setup() {
  const owner = await createInstructeurWithDossier(db);
  const id = owner.dossier.id as DossierId;
  const cap = owner.cap as CapDossierCap;
  await db("dossier").where({ id }).update({ demarche_numerique_number: "101" });
  await seedEspeceProtegeeReference(
    [
      {
        cd_ref: "2437",
        classification: "oiseau",
        noms_scientifiques: ["Morus bassanus"],
        noms_vernaculaires: ["Fou de Bassan"],
        cd_type_statuts: ["PN"],
      },
    ],
    db,
  );
  const synchronize = (file: FileId | null, connection: Knex | Knex.Transaction = db) =>
    synchronizeFichiersEspecesImpacteesFromDS88444(
      new Map([[101, file]]),
      new Map([[101, id]]),
      connection,
    );
  const pending = async (personCap = cap) =>
    (await getNotificationsForPersonneFromCap(personCap, db, id))[0].changes;
  return { owner, id, cap, synchronize, pending };
}

test("real replacements expose group revisions atomically and acknowledgments remain personal and revision-bound", async () => {
  const { owner, id, cap, synchronize, pending } = await setup();
  const colleague = await createInstructeurWithCapToGroup(db, {
    nomGroupe: "Species review colleague",
  });
  await attachCapToGroupe(db, colleague.cap, owner.groupeId);
  const first = await speciesFile(initial);
  await db.transaction(async (trx) => {
    await trx("dossier").where({ id }).update({ especes_impactees: first.id });
    expect(await dumpImpactEspeceFromFichier(id, first.id, trx)).toEqual([]);
  });
  const second = await speciesFile([["2437", "P-2-1", "11-100", ""]]);
  const sync = await db.transaction();
  try {
    expect(await synchronize(second.id, sync)).toEqual(new Set([id]));
    const before = await getDossierReviewSnapshot(id, cap, false, db);
    expect(before?.especesImpactees.impacts).toHaveLength(2);
    expect(before?.notificationSnapshot?.changes).toEqual([]);
    await sync.commit();
  } finally {
    if (!sync.isCompleted()) await sync.rollback();
  }
  const snapshot = await getDossierReviewSnapshot(id, cap, false, db);
  expect(snapshot?.especesImpactees.impacts).toHaveLength(1);
  expect(snapshot?.especesImpactees.impacts[0].nombreIndividus).toBe("11-100");
  const changes = snapshot!.notificationSnapshot!.changes;
  expect(changes.map(({ field }) => field).sort()).toEqual([capture, habitat].sort());
  const removed = changes.find(({ field }) => field === habitat)!;
  const habitatReference = await db("impact_type").where({ identifiant_pitchou: "P-4-2" }).first();
  expect(removed.label).toBe(habitatReference.libelle_pitchou);
  const oldCapture = changes.find(({ field }) => field === capture)!;

  const third = await speciesFile([["2437", "P-2-1", "101-1000", ""]]);
  await synchronize(third.id);
  await updateNotificationDossierFromCap(cap, { dossier: id, revisions: oldCapture.revisions }, db);
  const remaining = await pending();
  expect(remaining.map(({ field }) => field).sort()).toEqual([capture, habitat].sort());
  const newCapture = remaining.find(({ field }) => field === capture)!;
  expect(newCapture.revisions).toHaveLength(1);
  expect(newCapture.revisions[0]).not.toBe(oldCapture.revisions[0]);
  await updateNotificationDossierFromCap(cap, { dossier: id, revisions: newCapture.revisions }, db);
  expect((await pending()).map(({ field }) => field)).toEqual([habitat]);
  expect(
    (await pending(colleague.cap as CapDossierCap)).flatMap(({ revisions }) => revisions),
  ).toHaveLength(3);
  await updateNotificationDossierFromCap(cap, { dossier: id, revisions: removed.revisions }, db);
  expect(await pending()).toEqual([]);

  const identical = await speciesFile([["2437", "P-2-1", "101-1000", ""]]);
  expect(await synchronize(identical.id)).toEqual(new Set());
  expect(await synchronize(identical.id)).toEqual(new Set());
  expect(await pending()).toEqual([]);
});

test("later first additions, reordering, moving groups and clearing use canonical values", async () => {
  const { id, cap, synchronize, pending } = await setup();
  const first = await speciesFile(initial);
  expect(await synchronize(first.id)).toEqual(new Set([id]));
  expect((await pending()).map(({ field }) => field).sort()).toEqual([capture, habitat].sort());
  await updateNotificationDossierFromCap(
    cap,
    { dossier: id, revisions: (await pending()).flatMap(({ revisions }) => revisions) },
    db,
  );
  const reordered = await speciesFile(initial.toReversed());
  expect(await synchronize(reordered.id)).toEqual(new Set());
  const moved = await speciesFile([
    ["2437", "P-4-2", "", 100],
    ["2437", "P-4-2", "", 0],
  ]);
  expect(await synchronize(moved.id)).toEqual(new Set([id]));
  expect((await pending()).map(({ field }) => field).sort()).toEqual([capture, habitat].sort());
  expect(
    (await db("impact_espece").where({ dossier: id }))
      .map(({ surface_habitat_detruit }) => surface_habitat_detruit)
      .sort(),
  ).toEqual([0, 100]);
  await updateNotificationDossierFromCap(
    cap,
    { dossier: id, revisions: (await pending()).flatMap(({ revisions }) => revisions) },
    db,
  );
  await synchronize(null);
  expect((await pending()).map(({ field }) => field)).toEqual([habitat]);
  expect(await db("impact_espece").where({ dossier: id })).toEqual([]);
});

test("missing old rows and failed imports stay coarse, while same-file materialization stays silent", async () => {
  const { id, cap, synchronize, pending } = await setup();
  const first = await speciesFile(initial);
  await db("dossier").where({ id }).update({ especes_impactees: first.id });
  expect(await synchronize(first.id)).toEqual(new Set());
  expect(await pending()).toEqual([]);
  await db("impact_espece").where({ dossier: id }).delete();
  const next = await speciesFile(initial);
  await synchronize(next.id);
  expect((await pending()).map(({ field }) => field)).toEqual(["especes"]);
  expect(await db("impact_espece").where({ dossier: id })).toHaveLength(2);
  const oldCoarseRevisions = (await pending())[0].revisions;
  const broken = await createFichierS3(db, await getTestS3(), {
    name: "broken.ods",
    mediaType: "application/vnd.oasis.opendocument.spreadsheet",
    bytes: Buffer.from("not a spreadsheet"),
  });
  await synchronize(broken.id);
  expect(await db("impact_espece").where({ dossier: id })).toEqual([]);
  expect((await pending()).map(({ field }) => field)).toEqual(["especes"]);
  expect((await pending())[0].revisions).toHaveLength(2);
  await updateNotificationDossierFromCap(cap, { dossier: id, revisions: oldCoarseRevisions }, db);
  expect((await pending())[0].revisions).toHaveLength(1);
});
