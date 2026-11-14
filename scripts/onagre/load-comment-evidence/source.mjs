import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replaceAll("’", "'")
    .replaceAll(/\s+/gu, " ")
    .toLowerCase();
const activityName = (value) =>
  normalize(value)
    .replaceAll("–", "-")
    .replaceAll("dégradation d'aires de repos", "dégradation d'aire de repos")
    .replaceAll("autres qu naturalisés", "autres que naturalisés");
const index = (rows, key) => new Map((rows ?? []).map((r) => [r[key], r]));

export function sourceReader(manifest, references) {
  const entries = new Map([...manifest.entries, ...manifest.skipped].map((e) => [e.path, e]));
  const cache = new Map();
  return (occurrence, group) => {
    const entry = entries.get(occurrence.projectPath);
    assert(
      entry && entry.projectId === occurrence.projectId,
      "Source outside the pinned selection",
    );
    let project = cache.get(entry.path);
    if (!project) {
      const bytes = fs.readFileSync(entry.path);
      assert.equal(hash(bytes), entry.sha256, "Prepared source has changed");
      project = new Map(JSON.parse(bytes).demandes.map((d) => [d.identity.key, prepareDemande(d)]));
      if (cache.size >= 4) cache.delete(cache.keys().next().value);
      cache.set(entry.path, project);
    }
    const demande = project.get(occurrence.demandeKey);
    assert(demande, "Occurrence belongs to another demande");
    const source = demande.descriptions.get(occurrence.descriptionId);
    assert(source, "Description absent from its own demande");
    const species = demande.species.get(source.especesid);
    const impacts = demande.impacts.get(occurrence.descriptionId) ?? [];
    const issues = demande.issues.get(occurrence.descriptionId) ?? [];
    const facts = {
      descriptionId: occurrence.descriptionId,
      species: species?.nomscientifique ?? null,
      sourceTaxref: species?.notaxref ?? null,
      speciesResolved:
        impacts.length > 0 && !issues.some((i) => i.code === "species-reference-unresolved"),
      method: demande.methods.get(source.methodeid)?.libmethode ?? null,
      activityText: source.cmtactivitesespeces ?? null,
      descriptionText: source.cmtdescriptionsespeces ?? null,
      precisionText: source.precisionespeces ?? null,
      activities: (demande.links.get(occurrence.descriptionId) ?? []).map((link) => {
        const label = demande.activities.get(link.activitesid)?.libactivites ?? "Non renseignée";
        const impact = impacts.find((i) => i.sourceKey.endsWith(`:activites:${link.activitesid}`));
        const classification = impact?.values.classification ?? null;
        return {
          id: link.activitesid,
          label,
          classification,
          impactType: impact?.values.impact_type ?? null,
          candidates: references.impact_type
            .filter(
              (r) =>
                r.classification === classification &&
                r.activites_onagre.some((v) => activityName(v) === activityName(label)),
            )
            .map((r) => ({ code: r.identifiant_pitchou, label: r.libelle_pitchou })),
        };
      }),
    };
    verifyFacts(occurrence, group, source, facts, impacts, issues);
    return { facts, sourceHash: entry.sha256 };
  };
}

function prepareDemande(d) {
  const rows = d.source.rows;
  const collect = (items, key) => {
    const result = new Map();
    for (const item of items) {
      const id = key(item);
      if (!result.has(id)) result.set(id, []);
      result.get(id).push(item);
    }
    return result;
  };
  return {
    descriptions: index(rows.descriptionsespeces, "descriptionsespecesid"),
    species: index(rows.especes, "especesid"),
    methods: index(rows.methode, "methodeid"),
    activities: index(rows.activites, "activitesid"),
    links: collect(rows.descriptionsespeces_activites ?? [], (l) => l.descriptionsespecesid),
    impacts: collect(d.proposal.speciesImpacts ?? [], (i) => i.sourceKey.split(":")[2]),
    issues: collect(d.issues ?? [], (i) => i.descriptionId),
  };
}

function verifyFacts(occurrence, group, source, facts, impacts, issues) {
  for (const key of ["species", "sourceTaxref", "activityText", "descriptionText", "precisionText"])
    assert.equal(facts[key], occurrence[key], `Occurrence/source mismatch: ${key}`);
  const context = {
    activities: [...new Set(facts.activities.map((a) => a.label))].sort(),
    method: facts.method,
    classifications: [...new Set(impacts.map((i) => i.values.classification))].sort(),
    impactTypes: [...new Set(impacts.map((i) => i.values.impact_type))].sort(),
  };
  if (group.category === "unresolved_species") {
    assert(issues.some((i) => i.code === "species-reference-unresolved"));
    assert.deepEqual(group.context, {
      sourceTaxref: facts.sourceTaxref,
      sourceSpeciesId: source.especesid,
    });
  } else {
    if (group.category === "unresolved_activity") {
      context.unresolvedActivityId = group.context.unresolvedActivityId;
      assert(
        issues.some(
          (i) =>
            i.code === "species-impact-unresolved" && i.activityId === context.unresolvedActivityId,
        ),
      );
    }
    assert.deepEqual(context, group.context, "Group context differs from this description");
    if (group.category === "unmapped_method") assert(group.variants.includes(facts.method));
    else if (group.category !== "unresolved_activity")
      assert(group.variants.includes(String(source[group.category]).trim()));
  }
}
