import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { isCalendarDate } from "../../../libs/common/src/calendarDate.ts";

export async function readCommentDepotDates(path, expectedHash, demandeKeys) {
  const hash = createHash("sha256");
  const source = createReadStream(path);
  source.on("data", (chunk) => hash.update(chunk));
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  const rows = new Map();
  let columns = null;
  for await (const line of lines) {
    const header = /^COPY onagre\.demandes \((.*)\) FROM stdin;$/u.exec(line);
    if (header) {
      const names = header[1].split(", ");
      columns = ["demandesid", "projetid", "datereception"].map((name) => names.indexOf(name));
      if (columns.includes(-1))
        throw new Error("Expected Onagre demande identity, project and date");
    } else if (line === "\\.") columns = null;
    else if (columns) {
      const fields = line.split("\t");
      const [id, projectId, value] = columns.map((index) => fields[index]);
      const key = `onagre-national:demandes:${id}`;
      if (!demandeKeys.has(key)) continue;
      if (rows.has(key) || !/^\d+$/u.test(projectId) || (value !== "\\N" && !isCalendarDate(value)))
        throw new Error(`Invalid source date or identity for ${key}`);
      rows.set(key, {
        demande_key: key,
        source_project_id: projectId,
        ddep_depot_date: value === "\\N" ? null : value,
      });
    }
  }
  if (hash.digest("hex") !== expectedHash)
    throw new Error("Onagre dump does not match the selection");
  if (rows.size !== demandeKeys.size)
    throw new Error("The dump did not cover every review demande");
  return [...rows.values()];
}

export async function writeCommentDepotDates(trx, dates) {
  for (let offset = 0; offset < dates.length; offset += 500)
    await trx("onagre_comment_demande")
      .insert(dates.slice(offset, offset + 500))
      .onConflict("demande_key")
      .merge();
}
