import { motifDerogationOptions } from "../../libs/common/src/dossierFormOptions.ts";
import { prepareLocation } from "./prepare-fields/location.mjs";
import { prepareTitle } from "./prepare-fields/title.mjs";

// Shared preparation for every sample. Real source rows and review decisions stay in private JSON.
export function prepareFields(rows, mappings, options = {}) {
  if (rows.demandes?.length !== 1 || rows.projet?.length !== 1)
    throw new Error("Expected one demande and its project");
  const demande = rows.demandes[0],
    projet = rows.projet[0];
  if (demande.projetid !== projet.projetid) throw new Error("Source project mismatch");
  const location = prepareLocation(rows, options);
  const fields = { ...location.fields };
  const issues = [...location.issues];
  const decisions = Object.entries(fields).map(([field, value]) => ({
    target: `dossier.${field}`,
    value,
    status: "mapped",
    evidence: location.evidence,
    rule: null,
  }));
  const add = (field, value, evidence, rule = null) => {
    fields[field] = value;
    decisions.push({
      target: `dossier.${field}`,
      value,
      status: "mapped",
      evidence,
      rule: rule ? { key: rule.key, version: rule.version, status: rule.status } : null,
    });
  };
  if (options.relatedDemandes !== undefined) {
    const title = prepareTitle(demande, projet, options.relatedDemandes);
    add("name", title.name, title.evidence);
  }
  addDescription(rows, mappings, demande, projet, add);
  const motifStatus = addMotif(mappings, demande, add, issues);
  return { fields, decisions, issues, coverage: { location: location.status, motif: motifStatus } };
}

function addDescription(rows, mappings, demande, projet, add) {
  const coordinatorRule = mappings.find(
    (mapping) =>
      mapping.key === "field:projet.servicecoordinateurid" &&
      mapping.status === "validated" &&
      mapping.target === "dossier.description",
  );
  const coordinator =
    coordinatorRule && projet.servicecoordinateurid
      ? rows.services?.find((row) => row.servicesid === projet.servicecoordinateurid)
      : null;
  if (coordinatorRule && projet.servicecoordinateurid && !coordinator?.nomservice?.trim())
    throw new Error("Missing source coordinating service");
  add(
    "description",
    [
      projet.cmtprojet,
      projet.natureactivites,
      demande.lieux,
      demande.periodes?.trim() ? `Périodes souhaitées (Onagre) : ${demande.periodes}` : null,
      coordinator ? `Service coordinateur du projet (Onagre) : ${coordinator.nomservice}` : null,
    ]
      .filter((value) => value?.trim())
      .join("\n\n") || null,
    [
      `projet:${projet.projetid}.cmtprojet`,
      `projet:${projet.projetid}.natureactivites`,
      `demandes:${demande.demandesid}.lieux`,
      `demandes:${demande.demandesid}.periodes`,
      ...(coordinator
        ? [
            `projet:${projet.projetid}.servicecoordinateurid`,
            `services:${coordinator.servicesid}.nomservice`,
          ]
        : []),
    ],
  );
  add(
    "no_other_satisfactory_solution_justification",
    demande.solutionsalternatives?.trim() ? demande.solutionsalternatives : null,
    [`demandes:${demande.demandesid}.solutionsalternatives`],
  );
}

function addMotif(mappings, demande, add, issues) {
  let motifStatus = "missing-source";
  if (demande.motifderogationid) {
    const field = mappings.find(
      (mapping) =>
        mapping.key === "field:demandes.motifderogationid" && mapping.status === "validated",
    );
    const candidates = mappings.filter(
      (mapping) =>
        mapping.section === "motifderogation" &&
        mapping.key.startsWith("reference:") &&
        mapping.label.split(" · ")[0] === demande.motifderogationid &&
        mapping.status === "validated" &&
        mapping.target === "dossier.motif_derogation",
    );
    const choices = candidates.map((mapping) => ({
      mapping,
      choice: motifDerogationOptions.find(
        (choice) =>
          mapping.rule ===
          `Pour motifderogationid = ${demande.motifderogationid}, choisir le motif Pitchou « ${choice} ».`,
      ),
    }));
    if (
      field &&
      choices.length > 0 &&
      choices.every(({ choice }) => choice && choice === choices[0].choice)
    ) {
      add(
        "motif_derogation",
        choices[0].choice,
        [
          `demandes:${demande.demandesid}.motifderogationid`,
          `motifderogation:${demande.motifderogationid}.libmotifderogation`,
        ],
        choices[0].mapping,
      );
      motifStatus = "mapped";
    } else {
      motifStatus = "needs-review";
      issues.push({
        code: "motif-needs-review",
        blocking: false,
        message: "Motif présent dans la source sans correspondance validée unique prise en charge.",
      });
    }
  } else {
    add("motif_derogation", null, [`demandes:${demande.demandesid}.motifderogationid`]);
  }
  return motifStatus;
}
