import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { writeRecord } from "./writer.mjs";
const XLSX = createRequire(new URL("../../../libs/common/package.json", import.meta.url))("xlsx");
export const mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const fields = [
  "cd_ref",
  "classification",
  "impact_type",
  "impact_methode",
  "impact_moyen_de_poursuite",
  "nombre_individus",
  "nids",
  "oeufs",
  "surface_habitat_detruit",
];
export function validateSpecies(impacts) {
  if (!Array.isArray(impacts)) throw new Error("Expected species impacts array");
  const keys = new Set();
  for (const impact of impacts) {
    if (
      !/^onagre-national:descriptionsespeces:\d+:activites:\d+$/u.test(impact.sourceKey) ||
      keys.has(impact.sourceKey)
    )
      throw new Error("Invalid or duplicate species identity");
    keys.add(impact.sourceKey);
    if (
      !impact.values ||
      Object.keys(impact.values).length !== fields.length ||
      fields.some((key) => !Object.hasOwn(impact.values, key))
    )
      throw new Error("Invalid species fields");
    const v = impact.values;
    if (
      !/^\d+$/u.test(v.cd_ref) ||
      !["oiseau", "faune non-oiseau", "flore"].includes(v.classification) ||
      typeof v.impact_type !== "string"
    )
      throw new Error("Invalid species reference");
    for (const key of fields.slice(3))
      if (v[key] !== null) {
        if (
          ["nids", "oeufs", "surface_habitat_detruit"].includes(key)
            ? !Number.isSafeInteger(v[key]) || v[key] < 0
            : typeof v[key] !== "string"
        )
          throw new Error("Invalid species value");
      }
  }
}
export async function speciesWorkbook(client, impacts, sourceKey) {
  validateSpecies(impacts);
  const species = (
    await client.query("SELECT * FROM espece_protegee WHERE cd_ref = ANY($1::text[])", [
      impacts.map((row) => row.values.cd_ref),
    ])
  ).rows;
  const types = (await client.query("SELECT * FROM impact_type")).rows;
  const methods = (await client.query("SELECT * FROM impact_methode")).rows;
  const pursuits = (await client.query("SELECT * FROM impact_moyen_de_poursuite")).rows;
  const workbook = XLSX.utils.book_new();
  for (const classification of ["oiseau", "faune non-oiseau", "flore"]) {
    const rows = impacts.filter((row) => row.values.classification === classification);
    if (rows.length === 0) continue;
    const headers = [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      ...(classification === "oiseau" ? ["nids", "œufs"] : []),
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
      ...(classification === "flore"
        ? []
        : ["méthode", "code méthode", "transport", "code transport"]),
    ];
    const data = [headers];
    for (const { values: v } of rows) {
      data.push(impactRow(v, classification, { species, types, methods, pursuits }));
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), classification);
  }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Provenance", "Identité source"],
      [
        "Tableur généré pour la migration depuis le dump Onagre ; ce document n’est pas une pièce jointe originale.",
        sourceKey,
      ],
      ...impacts.map((row) => ["Impact source", row.sourceKey]),
    ]),
    "Provenance Onagre",
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
export async function prepareSpeciesFile(client, sample) {
  const impacts = sample.proposal.speciesImpacts;
  if (!impacts?.length) return null;
  const key = sample.identity.key;
  const body = await speciesWorkbook(client, impacts, key);
  const hash = createHash("sha256").update(body).digest("hex");
  const sourceKey = `${key}:species-file:${hash}`;
  const result = await writeRecord(
    client,
    key,
    sourceKey,
    "file",
    {
      name: `especes-onagre-${sample.identity.sourceId}-genere.xlsx`,
      media_type: mediaType,
      size: String(body.length),
    },
    {},
  );
  if (result.preserved.length > 0)
    throw new Error("Generated species file was edited locally; reconcile it before importing");
  return { result, body };
}
export async function writeSpecies(client, sample, dossierId, fileId) {
  const impacts = sample.proposal.speciesImpacts;
  const existing = (
    await client.query(
      "SELECT source_key FROM onagre_local_import.identity WHERE dossier_key=$1 AND table_name='impact_espece'",
      [sample.identity.key],
    )
  ).rows;
  const keys = new Set(impacts.map((row) => row.sourceKey));
  if (existing.some((row) => !keys.has(row.source_key)))
    throw new Error("Species impact removal requires explicit reconciliation");
  const unowned = (
    await client.query(
      "SELECT i.id FROM impact_espece i WHERE dossier=$1 AND NOT EXISTS (SELECT 1 FROM onagre_local_import.identity l WHERE l.table_name='impact_espece' AND l.target_id=i.id::text AND l.dossier_key=$2)",
      [dossierId, sample.identity.key],
    )
  ).rows;
  if (unowned.length > 0)
    throw new Error("Unowned species impacts exist; reconcile before importing");
  const results = [];
  for (const row of impacts) {
    const result = await writeRecord(
      client,
      sample.identity.key,
      row.sourceKey,
      "impact_espece",
      { ...row.values, source_file: fileId },
      { dossier: dossierId },
    );
    if (result.preserved.length > 0)
      throw new Error("Species impacts were edited locally; reconcile before importing");
    results.push(result);
  }
  return results;
}
export async function uploadSpeciesFiles(files, env) {
  if (files.length === 0) return;
  const endpoint = new URL(env.AWS_ENDPOINT_URL_S3 ?? "");
  if (
    !["localhost", "127.0.0.1"].includes(endpoint.hostname) ||
    endpoint.port !== "9000" ||
    endpoint.protocol !== "http:" ||
    env.S3_BUCKET !== "pitchou-dev"
  )
    throw new Error("Generated species files may only be uploaded to local development storage");
  const { S3Client, PutObjectCommand } = createRequire(
    new URL("../../../libs/server/package.json", import.meta.url),
  )("@aws-sdk/client-s3");
  const s3 = new S3Client({ endpoint: endpoint.href, forcePathStyle: true, maxAttempts: 2 });
  try {
    for (const file of files)
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: `files/${file.result.targetId}`,
          Body: file.body,
          ContentType: mediaType,
        }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
  } finally {
    s3.destroy();
  }
}

function impactRow(v, classification, { species, types, methods, pursuits }) {
  const taxon = species.find(
    (row) => row.cd_ref === v.cd_ref && row.classification === classification,
  );
  const type = types.find(
    (row) => row.identifiant_pitchou === v.impact_type && row.classification === classification,
  );
  if (!taxon || !type)
    throw new Error("Species or impact reference no longer matches the proposal");
  const method = methods.find(
    (row) => row.code === v.impact_methode && row.classification === classification,
  );
  const pursuit = pursuits.find(
    (row) => row.code === v.impact_moyen_de_poursuite && row.classification === classification,
  );
  if (
    (v.impact_methode !== null && (!method || !type.critere_methode)) ||
    (v.impact_moyen_de_poursuite !== null && (!pursuit || !type.critere_moyen_de_poursuite))
  )
    throw new Error("Method or pursuit is not applicable to the impact");
  for (const [key, criterion] of [
    ["nombre_individus", "nombre_individus"],
    ["nids", "nids"],
    ["oeufs", "oeufs"],
    ["surface_habitat_detruit", "surface_habitat_detruit"],
  ])
    if (v[key] !== null && !type[`critere_${criterion}`])
      throw new Error("Quantity is not applicable to the impact");
  return [
    taxon.noms_vernaculaires.join(", "),
    taxon.noms_scientifiques.join(", "),
    v.cd_ref,
    v.nombre_individus,
    ...(classification === "oiseau" ? [v.nids, v.oeufs] : []),
    v.surface_habitat_detruit,
    type.libelle_pitchou,
    type.identifiant_pitchou,
    type.code_europeen,
    ...(classification === "flore"
      ? []
      : [
          method?.libelle_pitchou ?? null,
          v.impact_methode,
          pursuit?.libelle_pitchou ?? null,
          v.impact_moyen_de_poursuite,
        ]),
  ];
}
