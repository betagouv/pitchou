// Explicit text destinations only: no inferred authors, expert dates, roles or permissions.
const definitions = [
  ["projet", "projetid", "cmtprojet", "Commentaire du projet"],
  [
    "avisserviceinstructeur",
    "avisserviceinstructeurid",
    "dateavis",
    "Date de l’avis du service instructeur",
  ],
  [
    "avisserviceinstructeur",
    "avisserviceinstructeurid",
    "cmtavisserviceinstructeur",
    "Commentaire de l’avis du service instructeur",
  ],
  [
    "avisreglementaires",
    "avisreglementairesid",
    "cmtavisreglementaire",
    "Commentaire de l’avis réglementaire",
  ],
  [
    "avisreglementaires",
    "avisreglementairesid",
    "nomsignataire",
    "Signataire de l’avis réglementaire",
  ],
  ["decisions", "decisionsid", "datepublicationdecision", "Date de publication de la décision"],
  ["decisions", "decisionsid", "dateenvoiprojetarrete", "Date d’envoi du projet d’arrêté"],
  ["decisions", "decisionsid", "datefinactivites", "Fin des activités autorisées"],
  ["decisions", "decisionsid", "cmtsanssuite", "Motif du classement sans suite"],
];
export function prepareComments(rows, mappings) {
  const comments = [];
  for (const [table, idField, field, title] of definitions) {
    const ruleKey = `field:${table}.${field}`;
    const rule = mappings.find((row) => row.key === ruleKey);
    if (
      !rule ||
      !["validated", "review"].includes(rule.status) ||
      !rule.target.includes("commentaire.content")
    )
      continue;
    for (const row of rows[table] ?? []) {
      const value = row[field];
      if (!value?.trim()) continue;
      comments.push({
        sourceKey: `onagre-national:${table}:${row[idField]}:${field}`,
        status: "proposed",
        content: `Onagre · ${title} (${table} n°${row[idField]}, ${field})\nDate de rédaction source non renseignée.\n\n${value}`,
        evidence: [`${table}:${row[idField]}.${field}`],
        ruleKey,
      });
    }
  }
  return comments;
}
