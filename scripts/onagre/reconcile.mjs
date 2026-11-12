import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { connect } from "./local-import/connection.mjs";
import { assertIgnoredFile } from "./local-import/files.mjs";
import { validateProjects } from "./local-import/projects.mjs";
import { readReconciledLinks } from "./local-import/linked.mjs";
import {
  reconciliationSource,
  reconciliationTargets,
  reconcileProjects,
} from "./local-import/reconciliation.mjs";

const [directory, output, ...extra] = process.argv.slice(2);
if (!directory || !output || extra.length > 0)
  throw new Error(
    "Usage: node --env-file=.env --import tsx scripts/onagre/reconcile.mjs prepared-project-directory private-report.json",
  );
assertIgnoredFile(directory);
assertIgnoredFile(output);
assertIgnoredFile(output + ".csv");
const sources = [],
  emptyProjects = [];
const ids = new Set();
const projectPaths = new Map();
let demandes = 0;
for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".json")).sort()) {
  const path = join(directory, filename);
  const project = JSON.parse(await readFile(path, "utf8"));
  if (project.formatVersion !== 2 || !Array.isArray(project.demandes))
    throw new Error(`Expected a prepared version 2 project: ${filename}`);
  if (project.demandes.length === 0) {
    emptyProjects.push({ file: filename, projectId: project.identity?.sourceId });
    continue;
  }
  validateProjects([project]);
  const source = reconciliationSource(project);
  if (ids.has(source.projectId)) throw new Error(`Duplicate source project: ${source.projectId}`);
  ids.add(source.projectId);
  projectPaths.set(source.projectId, path);
  sources.push(source);
  demandes += project.demandes.length;
}
if (sources.length === 0) throw new Error("No prepared projects found.");
const client = await connect(process.env);
try {
  await client.begin();
  await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const targets = await reconciliationTargets(client);
  const projects = reconcileProjects(sources, targets).filter((p) => p.candidates.length);
  const hasLedger = (
    await client.query(
      "SELECT to_regclass('onagre_local_import.reconciled_demande') IS NOT NULL AS present",
    )
  ).rows[0].present;
  const linkedProjects = new Set(
    hasLedger
      ? (
          await client.query(
            "SELECT DISTINCT project_key FROM onagre_local_import.reconciled_demande",
          )
        ).rows.map((r) => r.project_key)
      : [],
  );
  for (const item of projects) {
    item.requiresReview = true;
    if (!linkedProjects.has(`onagre-national:projet:${item.projectId}`)) continue;
    const project = JSON.parse(await readFile(projectPaths.get(item.projectId), "utf8"));
    try {
      const links = await readReconciledLinks(client, project);
      item.reviewedLinks = links.map((r) => ({
        demandeKey: r.source_key,
        dossierId: r.dossier_id,
      }));
      item.unlinkedDemandeKeys = project.demandes
        .filter((d) => !links.some((r) => r.source_key === d.identity.key))
        .map((d) => d.identity.key);
      item.requiresReview =
        item.unlinkedDemandeKeys.length > 0 ||
        item.candidates.some((c) => !links.some((r) => r.dossier_id === c.dossierId));
    } catch (error) {
      item.linkReviewError = error.message;
    }
  }
  const summary = {
    preparedProjects: sources.length,
    preparedDemandes: demandes,
    emptyProjectsSkipped: emptyProjects.length,
    existingUnownedRecords: targets.length,
    projectsWithDetectedMatch: projects.length,
    projectsRequiringReview: projects.filter((p) => p.requiresReview).length,
    projectsFullyReconciled: projects.filter((p) => !p.requiresReview).length,
    reviewedLinks: projects.reduce((count, p) => count + (p.reviewedLinks?.length ?? 0), 0),
    existingRecordsInCandidates: new Set(
      projects.flatMap((p) => p.candidates.map((c) => c.dossierId)),
    ).size,
    referenceMatchedProjects: projects.filter((p) =>
      p.candidates.some((c) => c.reasons.some((r) => r.endsWith("_reference"))),
    ).length,
    projectsWithoutDetectedMatch: sources.length - projects.length,
  };
  await client.finish(false);
  await writeFile(
    output,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        target: { host: "localhost", port: 5434, database: "especes_pro_3731" },
        applied: false,
        limitation:
          "Candidates are not confirmed duplicates. Absence of a match does not prove absence of overlap. No adoption or merge is performed.",
        summary,
        projects,
        emptyProjects,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    [
      "projet_onagre",
      "nom_projet",
      "demande_pitchou",
      "nom_pitchou",
      "reference_pitchou",
      "indices",
      "demandes_onagre",
      "revue_requise",
    ],
  ];
  for (const p of projects)
    for (const c of p.candidates)
      rows.push([
        p.projectId,
        p.projectName,
        c.dossierId,
        c.name,
        c.reference,
        c.reasons.join(" | "),
        c.demandeIds.join(" | "),
        p.requiresReview ? "oui" : "non — lien vérifié",
      ]);
  await writeFile(output + ".csv", rows.map((row) => row.map(cell).join(",")).join("\n") + "\n", {
    mode: 0o600,
  });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await client.end();
}
