import { prepareQuantities } from "./prepare-species/quantities.mjs";
// Verified species remain visible even when their impact type cannot be resolved.
const normalize = (value) =>
  (value ?? "").trim().replaceAll(/[’]/gu, "'").replaceAll(/\s+/gu, " ").toLowerCase();
// Equivalent source/reference spellings; do not broaden ambiguous business meanings.
const normalizeActivity = (value) =>
  normalize(value)
    .replaceAll("–", "-")
    .replaceAll("dégradation d'aires de repos", "dégradation d'aire de repos")
    .replaceAll("autres qu naturalisés", "autres que naturalisés");
const index = (rows, key) => new Map((rows ?? []).map((row) => [row[key], row]));
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
    notes.push(...sourceNotes(source, taxon));
    const links = (rows.descriptionsespeces_activites ?? []).filter(
      (row) => row.descriptionsespecesid === id,
    );
    const method = methods.get(source.methodeid);
    const resolved = resolveSpecies(taxon, references);
    if (resolved.length !== 1) {
      issue("species-reference-unresolved", {
        sourceSpeciesId: source.especesid,
        name: taxon?.nomscientifique,
      });
      notes.push(unresolvedTaxonNote(taxon, links, activities));
      if (method)
        for (const link of links.length > 0 ? links : [null])
          notes.push(methodNote(taxon, activities.get(link?.activitesid), method));
      continue;
    }
    const target = resolved[0];
    if (links.length === 0) {
      issue("species-impact-missing", {});
      impacts.push(impactRecord(id, null, target, null, null));
      if (method) notes.push(methodNote(taxon, null, method));
    }
    for (const link of links) {
      const activity = interpretedActivity(activities.get(link.activitesid), id, link, options);
      const types = matchingImpactTypes(references.types, target, activity);
      const selection =
        options.impactTypeBySourceKey?.[
          `onagre-national:descriptionsespeces:${id}:activites:${link.activitesid}`
        ];
      const type = selectImpactType(types, selection);
      if (!type) {
        issue("species-impact-unresolved", {
          activityId: link.activitesid,
          label: activity?.libactivites,
        });
        impacts.push(impactRecord(id, link, target, null, null));
        if (method) notes.push(methodNote(taxon, activity, method));
        continue;
      }
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
  }
  const quantities = prepareQuantities(rows, references.types, impacts);
  impacts.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  return {
    impacts,
    issues: [...issues, ...quantities.issues],
    notes: [...new Set([...notes, ...quantities.notes])],
    sourceDescriptions: (rows.descriptionsespeces ?? []).length,
  };
}

function unresolvedTaxonNote(taxon, links, activities) {
  const labels = [
    ...new Set(links.map((link) => activities.get(link.activitesid)?.libactivites)),
  ].filter((label) => typeof label === "string" && label.trim());
  const name = taxon?.nomscientifique?.trim() || "Taxon non renseigné";
  return `Mention conservée hors du tableau des espèces (Onagre) : ${name} — Activités déclarées : ${labels.join(" ; ") || "non renseignées"}.`;
}

function sourceNotes(source, taxon) {
  const labels = {
    cmtactivitesespeces: "cmtactivitesespeces",
    cmtdescriptionsespeces: "cmtdescriptionsespeces",
    precisionespeces: "precisionespeces",
    individufemelles: "Nombre de femelles indiqué",
    individumale: "Nombre de mâles indiqué",
  };
  return Object.entries(labels).flatMap(([key, label]) => {
    const value = source[key] == null ? "" : String(source[key]).trim();
    return value
      ? [`${taxon?.nomscientifique ?? "Espèce non renseignée"} — ${label} (Onagre) : ${value}`]
      : [];
  });
}

function interpretedActivity(activity, id, link, options) {
  const key = `onagre-national:descriptionsespeces:${id}:activites:${link.activitesid}`;
  const interpretation = options.activityInterpretationBySourceKey?.[key];
  if (interpretation === undefined) return activity;
  if (
    !activity ||
    typeof interpretation.label !== "string" ||
    !interpretation.label.trim() ||
    typeof interpretation.reason !== "string" ||
    !interpretation.reason.trim() ||
    !Array.isArray(interpretation.evidence) ||
    interpretation.evidence.length === 0 ||
    interpretation.evidence.some((value) => typeof value !== "string" || !value.trim())
  )
    throw new Error("Activity interpretation requires a source label, reason and evidence");
  return { ...activity, libactivites: interpretation.label };
}

function matchingImpactTypes(types, target, activity) {
  return types.filter(
    (row) =>
      row.classification === target.classification &&
      row.activites_onagre.some(
        (label) => normalizeActivity(label) === normalizeActivity(activity?.libactivites),
      ),
  );
}

function selectImpactType(types, selection) {
  if (selection !== undefined) {
    const selected = types.find((type) => type.identifiant_pitchou === selection);
    if (!selected) throw new Error("Prepared impact choice is not a reference candidate");
    return selected;
  }
  return types.length === 1 ? types[0] : null;
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
    notes.push(methodNote(taxon, activity, method));
    if (type.critere_methode || type.critere_moyen_de_poursuite)
      issue("species-method-review", {
        label: method.libmethode,
        classification: target.classification,
      });
  }
  return pursuit;
}

function methodNote(taxon, activity, method) {
  return `${taxon?.nomscientifique ?? "Taxon non renseigné"} — ${activity?.libactivites ?? "Activité non renseignée"} : méthode Onagre « ${method.libmethode} » (non renseignée dans le tableau Pitchou).`;
}

function impactRecord(id, link, target, type, pursuit) {
  return {
    sourceKey: `onagre-national:descriptionsespeces:${id}:activites:${link?.activitesid ?? "unspecified"}`,
    values: {
      cd_ref: target.cd_ref,
      classification: target.classification,
      impact_type: type?.identifiant_pitchou ?? null,
      impact_methode: null,
      impact_moyen_de_poursuite: pursuit,
      nombre_individus: null,
      nids: null,
      oeufs: null,
      surface_habitat_detruit: null,
    },
  };
}
