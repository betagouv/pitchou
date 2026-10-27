import assert from "node:assert/strict";
import { connect, initialize } from "./connection.mjs";
import { importSamples } from "./run.mjs";
import { speciesWorkbook, uploadSpeciesFiles } from "./species.mjs";
import { dbRowToEspeceProtegee } from "../../../libs/common/src/especes/classification.ts";
import { referentielRowsToBundle } from "../../../libs/common/src/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { importDescriptionMenacesEspecesFromOdsArrayBuffer } from "../../../libs/common/src/especes/importSpreadsheet.ts";
import { fromFileToDatabaseImpactEspeceRow } from "../../../libs/server/src/database/impact_espece/rows.ts";
const c = await connect(process.env);
try {
  await c.query("BEGIN");
  await initialize(c);
  const reviewer = (
    await c.query(
      "SELECT email FROM auth_user WHERE active AND pitchou_can_instruct(id) AND EXISTS (SELECT 1 FROM user_groupe WHERE user_id=auth_user.id) ORDER BY id LIMIT 1",
    )
  ).rows[0];
  const sourceId = String(Date.now()),
    key = `onagre-national:demandes:${sourceId}`;
  const species = (
    await c.query(
      "SELECT * FROM espece_protegee WHERE classification='faune non-oiseau' ORDER BY cd_ref LIMIT 1",
    )
  ).rows[0];
  const type = (
    await c.query(
      "SELECT * FROM impact_type WHERE classification='faune non-oiseau' AND critere_moyen_de_poursuite AND critere_nombre_individus ORDER BY identifiant_pitchou LIMIT 1",
    )
  ).rows[0];
  const pursuit = (
    await c.query(
      "SELECT * FROM impact_moyen_de_poursuite WHERE classification='faune non-oiseau' AND libelle_pitchou='Véhicules à moteur en mouvement'",
    )
  ).rows[0];
  const sample = {
    formatVersion: 1,
    identity: { sourceInstance: "onagre-national", sourceTable: "demandes", sourceId, key },
    proposal: {
      dossier: {
        source: "onagre",
        onagre_demande_identifier: `synthetic-species-${sourceId}`,
        name: "Synthetic species import",
        depot_date: null,
      },
      speciesImpacts: [
        {
          sourceKey: `onagre-national:descriptionsespeces:${sourceId}:activites:1`,
          values: {
            cd_ref: species.cd_ref,
            classification: species.classification,
            impact_type: type.identifiant_pitchou,
            impact_methode: null,
            impact_moyen_de_poursuite: pursuit.code,
            nombre_individus: null,
            nids: null,
            oeufs: null,
            surface_habitat_detruit: null,
          },
        },
      ],
    },
    issues: [],
  };
  const run = async (s = sample) => (await importSamples(c, [s], reviewer.email))[0];
  const initial = await run();
  const replay = await run();
  assert(replay.outcomes.every((row) => row.status === "unchanged"));
  assert.deepEqual(
    initial.outcomes.map((row) => row.targetId),
    replay.outcomes.map((row) => row.targetId),
  );
  const body = await speciesWorkbook(c, sample.proposal.speciesImpacts, key);
  assert.deepEqual(body, await speciesWorkbook(c, sample.proposal.speciesImpacts, key));
  const bundle = referentielRowsToBundle({
    typesImpact: (await c.query("SELECT * FROM impact_type")).rows,
    methodes: (await c.query("SELECT * FROM impact_methode")).rows,
    moyensDePoursuite: (await c.query("SELECT * FROM impact_moyen_de_poursuite")).rows,
  });
  const parsed = await importDescriptionMenacesEspecesFromOdsArrayBuffer(
    body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    new Map([[species.cd_ref, dbRowToEspeceProtegee(species)]]),
    bundle.activités,
    bundle.méthodes,
    bundle.moyensDePoursuite,
  );
  const file = initial.outcomes.find((row) => row.table === "file");
  const roundtrip = fromFileToDatabaseImpactEspeceRow(parsed, initial.dossierId, file.targetId);
  // Pitchou's native spreadsheet parser represents a blank individual count as an empty string.
  // The migration stores unknown quantities as SQL NULL; both denote an unspecified count.
  assert.equal(roundtrip[0].nombre_individus, "");
  roundtrip[0].nombre_individus = null;
  assert.deepEqual(roundtrip, [
    {
      ...sample.proposal.speciesImpacts[0].values,
      dossier: initial.dossierId,
      source_file: file.targetId,
    },
  ]);
  sample.proposal.speciesImpacts[0].values.nombre_individus = "11-100";
  const changed = await run();
  assert.equal(changed.outcomes.find((row) => row.table === "impact_espece").status, "updated");
  assert.notEqual(changed.outcomes.find((row) => row.table === "file").targetId, file.targetId);
  assert.equal(
    changed.outcomes.find((row) => row.table === "impact_espece").targetId,
    initial.outcomes.find((row) => row.table === "impact_espece").targetId,
  );
  assert((await run()).outcomes.every((row) => row.status === "unchanged"));
  const rejected = async (fn, pattern) => {
    await c.query("SAVEPOINT rejected");
    await assert.rejects(fn, pattern);
    await c.query("ROLLBACK TO SAVEPOINT rejected");
  };
  await rejected(async () => {
    const empty = structuredClone(sample);
    empty.proposal.speciesImpacts = [];
    await run(empty);
  }, /removal requires/u);
  await rejected(async () => {
    await c.query("UPDATE dossier SET especes_impactees=$2 WHERE id=$1", [
      initial.dossierId,
      file.targetId,
    ]);
    await run();
  }, /attachment was edited/u);
  await rejected(async () => {
    await c.query("UPDATE impact_espece SET nombre_individus='999' WHERE dossier=$1", [
      initial.dossierId,
    ]);
    await run();
  }, /edited locally/u);
  await rejected(async () => {
    await c.query(
      "INSERT INTO impact_espece (dossier,source_file,cd_ref,classification) VALUES ($1,$2,$3,$4)",
      [initial.dossierId, file.targetId, species.cd_ref, species.classification],
    );
    await run();
  }, /Unowned species/u);
  await rejected(async () => {
    const wrong = structuredClone(sample);
    wrong.proposal.speciesImpacts[0].values.classification = "oiseau";
    await run(wrong);
  }, /reference no longer/u);
  await assert.rejects(
    () =>
      uploadSpeciesFiles([{ result: { targetId: "unused" }, body }], {
        AWS_ENDPOINT_URL_S3: "https://example.com",
        S3_BUCKET: "pitchou-dev",
      }),
    /only be uploaded to local/u,
  );
  console.log(
    "Passed species checks: stable IDs and workbook bytes, native spreadsheet roundtrip, update without duplicates, immutable file versions, rejection of removed/unowned/edited impacts and replaced attachment, reference checks, local storage guard. All database writes rolled back; no storage writes.",
  );
} finally {
  await c.query("ROLLBACK");
  await c.end();
}
