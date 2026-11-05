import { validateSample } from "./validation.mjs";
import { isDeepStrictEqual } from "node:util";
import { departementName } from "../../../libs/common/src/departements.ts";

export function prepareDemandeLabel(demande) {
  const fields = demande.proposal.dossier;
  const code = fields.onagre_demande_identifier?.trim();
  if (!code) throw new Error("Missing Onagre reference; review the demande label before grouping");
  const departments = [...new Set(fields.departments ?? [])];
  const communes = [...new Set((fields.communes ?? []).map(({ name }) => name))];
  const departmentLocation = departments
    .map((department) => `${departementName(department)} (${department})`)
    .join(", ");
  const location =
    communes.length > 0
      ? communes.join(", ") + (departments.length > 0 ? ` (${departments.join(", ")})` : "")
      : departmentLocation;
  const label = location ? `${code} — ${location}` : code;
  // Large geographical perimeters should not overflow the existing label field.
  if (label.length <= 200) return label;
  const compact = departmentLocation ? `${code} — ${departmentLocation}` : code;
  if (compact.length > 200) return `${code} — ${departments.length} départements`;
  return compact;
}

export function validateProjects(projects) {
  const projectKeys = new Set(),
    demandeKeys = new Set(),
    companies = new Map();
  for (const project of projects) {
    const identity = project.identity;
    if (
      project.formatVersion !== 2 ||
      identity?.sourceInstance !== "onagre-national" ||
      identity.sourceTable !== "projet" ||
      typeof identity.sourceId !== "string" ||
      !/^[1-9]\d*$/u.test(identity.sourceId) ||
      identity.key !== `onagre-national:projet:${identity.sourceId}` ||
      projectKeys.has(identity.key)
    )
      throw new Error("Expected unique version 2 project identities");
    projectKeys.add(identity.key);
    if (
      typeof project.proposal?.name !== "string" ||
      !project.proposal.name.trim() ||
      Object.keys(project.proposal).some((key) => key !== "name")
    )
      throw new Error("Invalid project proposal");
    if (!Array.isArray(project.demandes) || project.demandes.length === 0)
      throw new Error("Project requires demandes");
    if (
      project.demandes.some((d) => d.identity?.sourceTable === "projet") &&
      (project.demandes.length !== 1 || (project.omittedDemandes ?? []).length > 0)
    )
      throw new Error("An initial demande is only valid for a project with no source demandes");
    for (const demande of project.demandes) {
      validateSample(demande);
      const porteur = demande.proposal.porteur;
      if (porteur?.type === "personne_morale") {
        if (
          companies.has(porteur.siret) &&
          !isDeepStrictEqual(companies.get(porteur.siret), porteur.values)
        )
          throw new Error("Conflicting prepared metadata for the same SIRET");
        companies.set(porteur.siret, porteur.values);
      }
      if (demande.identity.projetId !== identity.sourceId || demandeKeys.has(demande.identity.key))
        throw new Error("Duplicate demande or mismatched source project");
      if (typeof demande.label !== "string" || !demande.label.trim() || demande.label.length > 200)
        throw new Error("Invalid demande label");
      if (!Array.isArray(demande.proposal.records))
        throw new Error("Only prepared demandes can be imported");
      if (Object.hasOwn(demande.proposal.dossier, "name"))
        throw new Error("Keep the shared name in the project proposal, not individual demandes");
      demandeKeys.add(demande.identity.key);
    }
  }
  return projects;
}

/** Pure conversion: retain each demande's evidence and identity without editing the old files. */
export function groupPreparedDemandes(samples) {
  const projects = new Map();
  for (const original of samples) {
    validateSample(original);
    const demande = structuredClone(original);
    const source = demande.source?.rows?.projet?.find(
      (row) => row.projetid === demande.identity.projetId,
    );
    if (!source?.nomprojet?.trim()) throw new Error("Missing source project name");
    const id = demande.identity.projetId;
    if (!projects.has(id))
      projects.set(id, {
        formatVersion: 2,
        identity: {
          sourceInstance: "onagre-national",
          sourceTable: "projet",
          sourceId: id,
          key: `onagre-national:projet:${id}`,
        },
        proposal: { name: source.nomprojet },
        decisions: [
          {
            target: "grouping",
            status: "owner-approved",
            quote: "Now we want one dossier for each project in Onagre.",
            supersedes: "dossier-unit",
            scope:
              "Independent demandes with shared dossier access; preserve every business change.",
          },
        ],
        demandes: [],
        omittedDemandes: [],
      });
    const project = projects.get(id);
    if (project.proposal.name !== source.nomprojet) throw new Error("Conflicting project names");
    demande.label = prepareDemandeLabel(demande);
    delete demande.proposal.dossier.name;
    demande.decisions = [
      ...(demande.decisions ?? []),
      {
        target: "demande.label",
        status: "owner-approved",
        value: demande.label,
        reason:
          "Use the original Onagre code followed by the prepared project location; keep the shared project title separate.",
      },
    ];
    project.demandes.push(demande);
  }
  for (const project of projects.values()) {
    project.demandes.sort((a, b) => Number(a.identity.sourceId) - Number(b.identity.sourceId));
    const included = new Set(project.demandes.map((d) => d.identity.sourceId));
    const siblings = new Map(
      project.demandes.flatMap((d) => (d.source.relatedDemandes ?? []).map((row) => [row.id, row])),
    );
    project.omittedDemandes = [...siblings.values()]
      .filter((row) => !included.has(row.id))
      .map((row) => ({
        ...row,
        reason: "Outside the prepared local sample set; retained in the source dump.",
      }));
  }
  return validateProjects([...projects.values()]);
}
