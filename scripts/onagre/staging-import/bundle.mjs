import fs from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { validateProjects } from "../local-import/projects.mjs";
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function* lines(path) {
  const input = fs.createReadStream(path).pipe(createGunzip());
  const reader = createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of reader) if (line) yield JSON.parse(line);
  } finally {
    reader.close();
    input.destroy();
  }
}

async function* projects(path) {
  const canonical = new Map();
  let header = true;
  for await (const entry of lines(path)) {
    if (header) {
      header = false;
      continue;
    }
    if (
      hash(JSON.stringify(entry.project)) !== entry.sha256 ||
      !/^[a-f0-9]{64}$/u.test(entry.sourceSha256)
    )
      throw new Error("Prepared project checksum mismatch");
    for (const demande of entry.project.demandes) {
      const actor = demande.proposal.porteur;
      if (actor?.type === "personne_morale") {
        if (canonical.has(actor.siret)) actor.values = canonical.get(actor.siret);
        else canonical.set(actor.siret, actor.values);
      }
    }
    validateProjects([entry.project]);
    yield entry;
  }
}

export async function readBundle(path, expectedHash) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(path)) digest.update(chunk);
  if (!/^[a-f0-9]{64}$/u.test(expectedHash) || digest.digest("hex") !== expectedHash)
    throw new Error("The private bundle does not match the reviewed SHA256");
  let header;
  for await (const row of lines(path)) {
    header = row;
    break;
  }
  if (header?.formatVersion !== 1 || header.target !== "pitchou-staging" || !header.reviewedThrough)
    throw new Error("Expected an explicitly reviewed staging bundle");
  // Validate every project before opening a database transaction; keep the large corpus streamed.
  const keys = new Set();
  let count = 0;
  for await (const entry of projects(path)) {
    for (const item of [entry.project, ...entry.project.demandes]) {
      if (keys.has(item.identity.key)) throw new Error("Duplicate bundle identity");
      keys.add(item.identity.key);
    }
    count++;
  }
  if (count !== header.projectCount) throw new Error("Incomplete project bundle");
  return { ...header, projects: () => projects(path) };
}
