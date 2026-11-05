const counts = [
  {
    source: "quantiteespeces",
    target: "nombre_individus",
    result: "nbindividus",
    label: "Nombre de spécimens",
  },
  { source: "quantitenids", target: "nids", result: "nbnids", label: "Nombre de nids" },
  { source: "quantiteoeufs", target: "oeufs", result: "nboeufs", label: "Nombre d’œufs" },
];
const additionalLabels = {
  surfacedetruiteares: "Surface détruite (ares)",
  surfacedetruitehectares: "Surface détruite (hectares)",
  especes_classeeffectif: "Classe d’effectif",
};
const resultLabels = {
  nbindividus: "Nombre d’individus",
  nbnids: "Nombre de nids",
  nboeufs: "Nombre d’œufs",
  nbcouples: "Nombre de couples",
  nbsiteselevage: "Nombre de sites d’élevage",
  nbairerepos: "Nombre d’aires de repos",
  nbresultats: "Nombre de résultats",
  autres: "Autres (unité ou type source)",
};
const present = (value) => value != null && String(value).trim() !== "";
function integer(value) {
  if (!present(value) || !/^\d+$/u.test(String(value).trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

// A count belongs to its source description, not independently to every linked activity.
export function prepareQuantities(rows, types, impacts) {
  const notes = [],
    issues = [];
  for (const source of rows.descriptionsespeces ?? []) {
    const context = quantityContext(source, rows, types, impacts);
    const pending = {};
    for (const field of counts) {
      if (!present(source[field.source])) continue;
      if (!assignCount(source, field, context)) {
        pending[field.source] = source[field.source];
        notes.push(
          `${context.label} — ${field.label} indiqué dans Onagre : ${source[field.source]} (conservé hors des colonnes de quantité).`,
        );
      }
    }
    for (const [key, label] of Object.entries(additionalLabels)) {
      if (!present(source[key])) continue;
      pending[key] = source[key];
      const value =
        key === "especes_classeeffectif"
          ? (rows.especes_classeeffectif?.find((r) => r.classeeffectifid === source[key])
              ?.libclasseeffectif ?? `libellé non disponible (référence ${source[key]})`)
          : source[key];
      notes.push(
        `${context.label} — ${label} indiqué dans Onagre : ${value} (conservé hors des colonnes de quantité).`,
      );
    }
    for (const result of context.results) {
      for (const [key, label] of Object.entries(resultLabels)) {
        if (!present(result[key])) continue;
        pending[`resultat.${key}`] = result[key];
        notes.push(
          `${context.label} — Résultat Onagre, ${label} : ${result[key]} (valeur source distincte de la description).`,
        );
      }
    }
    if (Object.keys(pending).length > 0)
      issues.push({
        code: "species-quantities-review",
        descriptionId: source.descriptionsespecesid,
        values: pending,
      });
  }
  return { notes, issues };
}

function quantityContext(source, rows, types, impacts) {
  const taxon = rows.especes?.find((row) => row.especesid === source.especesid);
  const links = (rows.descriptionsespeces_activites ?? []).filter(
    (row) => row.descriptionsespecesid === source.descriptionsespecesid,
  );
  const activities = [
    ...new Set(
      links
        .map(
          (link) =>
            rows.activites?.find((row) => row.activitesid === link.activitesid)?.libactivites,
        )
        .filter(Boolean),
    ),
  ];
  return {
    label: `${taxon?.nomscientifique ?? "Taxon non renseigné"} (activités Onagre : ${activities.join(" ; ") || "non renseignées"})`,
    results: (rows.resultat ?? []).filter((row) => row.resultatid === source.resultatid),
    impacts: impacts.filter((row) =>
      row.sourceKey.startsWith(
        `onagre-national:descriptionsespeces:${source.descriptionsespecesid}:`,
      ),
    ),
    types,
  };
}

function assignCount(source, field, { impacts, types, results }) {
  const value = integer(source[field.source]);
  if (value === null || value === 0 || impacts.some((row) => row.values.impact_type === null))
    return false;
  if (present(source.resultatid) && results.length === 0) return false;
  if (results.some((row) => present(row[field.result]) && integer(row[field.result]) !== value))
    return false;
  const candidates = impacts.filter(
    (row) =>
      types.find((type) => type.identifiant_pitchou === row.values.impact_type)?.[
        `critere_${field.target}`
      ],
  );
  if (candidates.length !== 1) return false;
  candidates[0].values[field.target] = field.target === "nombre_individus" ? String(value) : value;
  return true;
}
