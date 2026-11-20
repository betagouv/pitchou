import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { assertIgnoredFile } from "./files.mjs";
import { writeRecord } from "./writer.mjs";

export async function readAttachmentManifest(path) {
  if (!path) return new Map();
  assertIgnoredFile(path);
  const entries = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(entries)) throw new Error("Expected an Onagre attachment manifest array");
  const manifest = new Map();
  for (const entry of entries) {
    if (
      !/^\d+$/u.test(entry.sourceId) ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256) ||
      typeof entry.mediaType !== "string" ||
      !/^[\w.+-]+\/[\w.+-]+$/u.test(entry.mediaType) ||
      manifest.has(String(entry.sourceId))
    )
      throw new Error("Invalid or duplicate Onagre attachment manifest entry");
    assertIgnoredFile(entry.path);
    manifest.set(String(entry.sourceId), entry);
  }
  return manifest;
}

export async function writeAttachments(client, sample, dossierId, options) {
  const ids = new Map();
  const outcomes = [];
  const unavailable = [];
  const conflicts = [];
  const pieces = sample.source?.rows?.piecesjointes ?? [];
  if (pieces.length === 0) return { ids, outcomes, unavailable, conflicts };
  const key = sample.identity.key;
  const recorded = new Map(
    (
      await client
        .trx("onagre_local_import.identity")
        .where({ dossier_key: key, table_name: "other_attachment" })
    ).map((entry) => [entry.source_key, entry]),
  );
  for (const piece of pieces) {
    const sourceId = String(piece.piecesjointesid);
    const name = (piece.nompj || piece.descriptionpj || "").split(/[\\/]/u).at(-1);
    const sourceKey = `onagre-national:piecesjointes:${sourceId}`;
    const replay = recorded.get(`${sourceKey}:attachment`);
    const entry = options.attachments?.get(sourceId);
    if (!entry && replay) {
      const stored = await client
        .trx("other_attachment")
        .where({ id: replay.target_id, dossier: dossierId })
        .first();
      if (!stored || stored.fichier !== replay.last_fields.fichier)
        throw new Error(`Imported Onagre attachment changed: ${sourceId}`);
      ids.set(sourceId, stored.fichier);
      continue;
    }
    if (!entry || !name) {
      unavailable.push({ sourceId, name });
      continue;
    }
    if (!options.files) throw new Error("An upload queue is required for Onagre attachments");
    if (!replay && (await hasAttachmentNamed(client, dossierId, name))) {
      conflicts.push({ sourceId, name, reason: "existing_filename" });
      continue;
    }
    const body = await readFile(entry.path);
    if (createHash("sha256").update(body).digest("hex") !== entry.sha256)
      throw new Error(`Onagre attachment hash changed: ${sourceId}`);
    const file = await writeRecord(
      client,
      key,
      `${sourceKey}:file:${entry.sha256}`,
      "file",
      {
        name,
        media_type: entry.mediaType,
        size: String(body.length),
      },
      {},
    );
    const attachment = await writeRecord(
      client,
      key,
      `${sourceKey}:attachment`,
      "other_attachment",
      {
        fichier: file.targetId,
        type: "Pièce jointe Onagre",
      },
      { dossier: dossierId },
    );
    options.files.push({ result: file, body, mediaType: entry.mediaType });
    ids.set(sourceId, file.targetId);
    outcomes.push(file, attachment);
  }
  return { ids, outcomes, unavailable, conflicts };
}

async function hasAttachmentNamed(client, dossierId, name) {
  return (
    (
      await client.query(
        `SELECT 1 FROM file f WHERE lower(f.name)=lower($2) AND f.id IN (
      SELECT fichier FROM other_attachment WHERE dossier=$1
      UNION SELECT fichier FROM edge_dossier__fichier_pieces_jointes_petitionnaire WHERE dossier=$1
      UNION SELECT fichier FROM decision_administrative WHERE dossier=$1
      UNION SELECT avis_fichier FROM avis_expert WHERE dossier=$1
      UNION SELECT saisine_fichier FROM avis_expert WHERE dossier=$1
    ) LIMIT 1`,
        [dossierId, name],
      )
    ).rows.length > 0
  );
}
