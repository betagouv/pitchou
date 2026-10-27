// Only explicit reference correspondences are imported; unresolved source data stays reviewable.
const normalize = (value) =>
  (value ?? "").trim().replaceAll(/[’]/gu, "'").replaceAll(/\s+/gu, " ").toLowerCase();
const index = (rows, key) => new Map((rows ?? []).map((row) => [row[key], row]));
const quantityFields = [
  "quantiteespeces",
  "individufemelles",
  "individumale",
  "quantiteoeufs",
  "quantitenids",
  "surfacedetruiteares",
  "surfacedetruitehectares",
  "especes_classeeffectif",
];
export function prepareSpecies(rows, references, options = {}) {
  const species = index(rows.especes, "especesid");
  const activities = index(rows.activites, "activitesid");
  const methods = index(rows.methode, "methodeid");
  const impacts = [],
    issues = [],
    notes = [];
  for (const source of rows.descriptionsespeces ?? []) {
    const id = source.descriptionsespecesid,
      taxon = species.get(source.especesid);
    const issue = (code, details) => issues.push({ code, descriptionId: id, ...details });
    const resolved = resolveSpecies(taxon, references);
    if (resolved.length !== 1) {
      issue("species-reference-unresolved", {
        sourceSpeciesId: source.especesid,
        name: taxon?.nomscientifique,
      });
      continue;
    }
    const target = resolved[0];
    const links = (rows.descriptionsespeces_activites ?? []).filter(
      (row) => row.descriptionsespecesid === id,
    );
    if (links.length === 0) issue("species-impact-missing", {});
    const quantities = Object.fromEntries(
      quantityFields
        .filter((key) => source[key] != null && String(source[key]).trim() !== "")
        .map((key) => [key, source[key]]),
    );
    if (Object.keys(quantities).length > 0)
      issue("species-quantities-review", { values: quantities });
    for (const link of links) {
      const activity = activities.get(link.activitesid);
      const types = references.types.filter(
        (row) =>
          row.classification === target.classification &&
          row.activites_onagre.some(
            (label) => normalize(label) === normalize(activity?.libactivites),
          ),
      );
      if (types.length !== 1) {
        issue("species-impact-unresolved", {
          activityId: link.activitesid,
          label: activity?.libactivites,
        });
        continue;
      }
      const type = types[0],
        method = methods.get(source.methodeid);
      const pursuit = resolvePursuit({
        method,
        options,
        target,
        type,
        taxon,
        activity,
        references,
        notes,
        issue,
      });
      impacts.push(impactRecord(id, link, target, type, pursuit));
    }
    for (const key of ["cmtactivitesespeces", "cmtdescriptionsespeces", "precisionespeces"])
      if (source[key]?.trim())
        notes.push(`${taxon.nomscientifique} — ${key} (Onagre) : ${source[key].trim()}`);
  }
  impacts.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  return {
    impacts,
    issues,
    notes: [...new Set(notes)],
    sourceDescriptions: (rows.descriptionsespeces ?? []).length,
  };
}

function resolveSpecies(taxon, references) {
  const candidates = references.taxref.filter((row) =>
    [taxon?.notaxref, taxon?.nonomscientifique].includes(row.cd_nom),
  );
  return references.species.filter(
    (row) =>
      candidates.some((candidate) => candidate.cd_ref === row.cd_ref) &&
      row.noms_scientifiques.some((name) => normalize(name) === normalize(taxon?.nomscientifique)),
  );
}

function resolvePursuit({
  method,
  options,
  target,
  type,
  taxon,
  activity,
  references,
  notes,
  issue,
}) {
  let pursuit = null;
  if (
    method &&
    options.motorVehicleNonBird &&
    target.classification === "faune non-oiseau" &&
    type.critere_moyen_de_poursuite &&
    ["véhicule motorisé", "véhicules motorisés"].includes(normalize(method.libmethode))
  ) {
    const choices = references.pursuits.filter(
      (row) =>
        row.classification === target.classification &&
        row.libelle_pitchou === "Véhicules à moteur en mouvement",
    );
    if (choices.length !== 1) throw new Error("Approved vehicle reference is missing or ambiguous");
    pursuit = choices[0].code;
  } else if (method) {
    notes.push(
      `${taxon.nomscientifique} — ${activity.libactivites} : méthode Onagre « ${method.libmethode} » (non renseignée dans le tableau Pitchou).`,
    );
    if (type.critere_methode || type.critere_moyen_de_poursuite)
      issue("species-method-review", {
        label: method.libmethode,
        classification: target.classification,
      });
  }
  return pursuit;
}

function impactRecord(id, link, target, type, pursuit) {
  return {
    sourceKey: `onagre-national:descriptionsespeces:${id}:activites:${link.activitesid}`,
    values: {
      cd_ref: target.cd_ref,
      classification: target.classification,
      impact_type: type.identifiant_pitchou,
      impact_methode: null,
      impact_moyen_de_poursuite: pursuit,
      nombre_individus: null,
      nids: null,
      oeufs: null,
      surface_habitat_detruit: null,
    },
  };
}
