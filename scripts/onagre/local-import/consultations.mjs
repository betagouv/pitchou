import { isCalendarDate } from "../../../libs/common/src/calendarDate.ts";

const date = (value) => (isCalendarDate(value) ? value : null);
const text = (value) => value?.trim() || null;
const sourceKey = (table, id) => `onagre-national:${table}:${id}`;

function findName(rows, idField, id, labelField) {
  return rows?.find((entry) => entry[idField] === id)?.[labelField];
}

function dateAfterFourMonths(day) {
  const value = new Date(day);
  const originalDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + 4);
  const lastDay = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(originalDay, lastDay));
  return value.toISOString().slice(0, 10);
}

export function prepareConsultations(sample) {
  const rows = sample.source?.rows ?? {};
  const files = (column, id) =>
    (rows.piecesjointes ?? [])
      .filter((piece) => piece[column] === id)
      .map((piece) => ({
        sourceId: piece.piecesjointesid,
        name:
          (piece.nompj || piece.descriptionpj || "").split(/[\\/]/u).at(-1) ||
          "Pièce jointe Onagre",
      }));
  const items = (table, kind, map) =>
    (rows[table] ?? []).map((row) => {
      const column = `${table}id`;
      return {
        key: sourceKey(table, row[column]),
        kind,
        ...map(row),
        files: files(column, row[column]),
      };
    });
  const saisines = items("avisserviceinstructeur", "saisine", (row) => ({
    organisation: null,
    saisineDate: date(row.dateavis),
    responseDate: null,
    outcome: null,
    comment: text(row.cmtavisserviceinstructeur),
  }));
  for (const saisine of saisines) saisine.organisation = councilFromFiles(saisine.files);
  const opinions = items("avisreglementaires", "regulatory", (row) => ({
    organisation:
      findName(
        rows.organismeexperts,
        "organismeexpertsid",
        row.organismeexpertsid,
        "liborganisme",
      ) ?? null,
    saisineDate: null,
    responseDate: date(row.dateavis),
    outcome:
      findName(
        rows.natureavisreglementaire,
        "natureavisreglementaireid",
        row.natureavisreglementaireid,
        "libnatureavisreglementaire",
      ) ?? null,
    comment: text(row.cmtavisreglementaire),
  }));
  const optional = items("avisfacultatifs", "optional", (row) => ({
    organisation:
      findName(
        rows.organismeexperts,
        "organismeexpertsid",
        row.organismeexpertsid,
        "liborganisme",
      ) ?? null,
    saisineDate: date(row.datedemandeavisfacultatif),
    responseDate: date(row.dateretouravisfacultatif),
    outcome:
      findName(
        rows.natureavisfacultatif,
        "natureavisfacultatifid",
        row.natureavisfacultatifid,
        "libnatureavisfacultatif",
      ) ?? null,
    comment: text(row.cmtavisfacultatif),
  }));
  linkRegulatoryResponses(saisines, opinions, rows.avisreglementaires ?? []);
  return [...saisines, ...opinions, ...optional];
}

function councilFromFiles(files) {
  const councils = new Set(
    files.flatMap(({ name }) => name.match(/(?:CNPN|CSRPN)/giu) ?? []).map((v) => v.toUpperCase()),
  );
  return councils.size === 1 ? [...councils][0] : null;
}

const council = (value) => /^(CNPN|CSRPN)\b/u.exec(value ?? "")?.[1];

function linkRegulatoryResponses(saisines, opinions, rawOpinions) {
  const byOpinion = new Map();
  const bySaisine = new Map();
  for (const opinion of opinions) {
    const expert = council(opinion.organisation);
    if (!opinion.responseDate || !expert) continue;
    const candidates = saisines.filter(
      (saisine) =>
        saisine.saisineDate &&
        (!saisine.organisation || saisine.organisation === expert) &&
        opinion.responseDate >= saisine.saisineDate &&
        opinion.responseDate <= dateAfterFourMonths(saisine.saisineDate),
    );
    byOpinion.set(opinion, candidates);
    for (const saisine of candidates) bySaisine.set(saisine, (bySaisine.get(saisine) ?? 0) + 1);
  }
  for (const [opinion, candidates] of byOpinion) {
    if (candidates.length !== 1 || bySaisine.get(candidates[0]) !== 1) continue;
    linkResponse(candidates[0], opinion, "unique_date_window");
  }
  const transmissionDates = new Map(
    rawOpinions.map((row) => [
      sourceKey("avisreglementaires", row.avisreglementairesid),
      date(row.datetransmissionorganismeoudeb),
    ]),
  );
  linkDocumentedResponses(byOpinion, transmissionDates);
}

function linkDocumentedResponses(byOpinion, transmissionDates) {
  const evidence = new Map();
  const claimants = new Map();
  for (const [opinion, candidates] of byOpinion) {
    const transmission = transmissionDates.get(opinion.key);
    if (opinion.relatedKey || !transmission) continue;
    const supported = candidates.filter(
      (saisine) =>
        !saisine.relatedKey &&
        saisine.saisineDate === transmission &&
        saisine.organisation === council(opinion.organisation) &&
        saisine.files.some(({ name }) =>
          identifiesSaisine(name, saisine.organisation, transmission),
        ),
    );
    for (const saisine of supported) claimants.set(saisine, (claimants.get(saisine) ?? 0) + 1);
    if (candidates.length > 1 && supported.length === 1) evidence.set(opinion, supported[0]);
  }
  for (const [opinion, saisine] of evidence)
    if (claimants.get(saisine) === 1)
      linkResponse(saisine, opinion, "saisine_file_and_transmission");
}

function identifiesSaisine(name, expert, transmission) {
  const label = name
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toUpperCase();
  if (!label.includes("SAISINE") || !label.includes(expert) || /MINISTR|REPONSE/u.test(label))
    return false;
  const fileDates = [
    ...label.matchAll(/(?<!\d)(20\d{2})[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])(?!\d)/gu),
  ];
  return fileDates.every((match) => match.slice(1, 4).join("-") === transmission);
}

function linkResponse(saisine, opinion, basis) {
  opinion.relatedSaisineDate = saisine.saisineDate;
  saisine.relatedResponseDate = opinion.responseDate;
  opinion.relatedKey = saisine.key;
  saisine.relatedKey = opinion.key;
  opinion.associationBasis = basis;
  saisine.associationBasis = basis;
  saisine.organisation ??= council(opinion.organisation) ?? null;
}

export async function writeConsultations(client, sample, dossierId, expertIds, attachmentIds) {
  for (const { key, ...payload } of prepareConsultations(sample)) {
    await client
      .trx("onagre_consultation")
      .insert({
        source_key: key,
        dossier: dossierId,
        avis_expert_id: expertIds.get(key) ?? null,
        payload: {
          ...payload,
          files: payload.files.map((piece) => ({
            ...piece,
            fileId: attachmentIds.get(piece.sourceId),
          })),
        },
      })
      .onConflict("source_key")
      .merge(["avis_expert_id", "payload"])
      .where("onagre_consultation.dossier", dossierId);
  }
}
