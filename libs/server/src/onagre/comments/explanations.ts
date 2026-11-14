import type { CommentGroup } from "@pitchou/types/onagreComments.ts";
import type { CommentEvidence, CommentExplanation } from "@pitchou/types/onagreCommentEvidence.ts";

export function explainOccurrences(
  group: CommentGroup,
  occurrences: CommentEvidence[],
): CommentExplanation[] {
  const explanations = new Map<string, CommentExplanation>();
  for (const occurrence of occurrences) {
    const explanation = explainOccurrence(group, occurrence);
    // Combine only identical facts and reasoning; preserve every species and source description.
    const key = JSON.stringify(explanation);
    let combined = explanations.get(key);
    if (!combined) {
      combined = { ...explanation, species: [], descriptionIds: [] };
      explanations.set(key, combined);
    }
    const species = occurrence.species || "Espèce non renseignée";
    if (!combined.species.includes(species)) combined.species.push(species);
    combined.descriptionIds.push(occurrence.descriptionId);
  }
  return [...explanations.values()];
}

function explainOccurrence(group: CommentGroup, source: CommentEvidence) {
  const activities =
    group.category === "unresolved_activity"
      ? source.activities.filter((a) => a.id === group.payload.context.unresolvedActivityId)
      : source.activities;
  const facts = sourceFacts(source, activities);
  const reasons: string[] = [];
  let decision: string;
  switch (group.category) {
    case "unresolved_species":
      facts.unshift(
        `Identifiant TAXREF indiqué dans Onagre : ${source.sourceTaxref || "non renseigné"}.`,
      );
      reasons.push(
        "Lors de la préparation, le rapprochement du nom scientifique et des identifiants Onagre n’a pas permis de retenir une espèce unique dans le référentiel Pitchou. Cela ne signifie pas que l’espèce est absente de TAXREF.",
      );
      decision =
        "Vérifier le nom et l’identifiant de cette espèce, puis valider sa correspondance ou demander un complément au référentiel. Conserver la mention source tant que ce point n’est pas résolu.";
      break;
    case "unresolved_activity":
      reasons.push(...activities.map(activityReason));
      if (activities.length === 0)
        reasons.push(
          "L’activité signalée dans ce groupe n’a pas pu être retrouvée dans les faits de cette demande.",
        );
      decision =
        "À partir du protocole et des précisions de cette demande, choisir le type d’impact adapté ou demander une correspondance supplémentaire. Le libellé seul ne valide pas ce choix.";
      break;
    case "unmapped_method":
      reasons.push(
        `La méthode « ${source.method ?? group.value} » est conservée en commentaire : sa correspondance avec les champs méthode ou moyen de poursuite de Pitchou n’a pas été validée lors de la préparation.`,
      );
      if (!source.speciesResolved)
        reasons.push(
          "L’espèce n’a pas été résolue : sa classification doit d’abord être vérifiée pour choisir les valeurs Pitchou adaptées.",
        );
      else if (activities.length === 0)
        reasons.push(
          "Aucune activité n’est renseignée pour cette description ; le type d’impact à associer à la méthode reste à déterminer.",
        );
      else reasons.push(...activities.filter((a) => !a.impactType).map(activityReason));
      decision =
        "Vérifier l’activité et la technique réellement utilisées, puis valider une méthode ou un moyen de poursuite compatible avec le type d’impact, ou conserver ce libellé en commentaire.";
      break;
    case "cmtactivitesespeces":
      reasons.push(
        "Ce texte a été saisi librement pour l’activité. La préparation le conserve en commentaire, sans le traduire automatiquement en type d’impact, méthode ou moyen de poursuite. Une précision utile peut donc rester uniquement dans le texte.",
      );
      decision =
        "Décider si ce texte permet de compléter un champ structuré, dans ce contexte d’activité et d’espèce, ou s’il doit rester en commentaire.";
      break;
    case "cmtdescriptionsespeces":
      reasons.push(
        "La préparation conserve cette description libre en commentaire. Son contenu n’a pas été interprété automatiquement pour compléter les informations structurées sur l’espèce ou ses impacts ; il n’est pas nécessairement ambigu.",
      );
      decision =
        "Vérifier si la description contient une information à reporter dans un champ Pitchou, ou conserver la description telle quelle en commentaire.";
      break;
    case "precisionespeces":
      reasons.push(
        "La préparation conserve cette précision libre en commentaire. Elle peut qualifier les spécimens ou l’opération sans correspondre à une valeur structurée unique ; aucune interprétation automatique n’a été appliquée.",
      );
      decision =
        "Décider si cette précision doit compléter un champ Pitchou ou rester en commentaire, en préservant les distinctions indiquées dans le texte.";
      break;
  }
  return { facts: [...new Set(facts)], reasons: [...new Set(reasons)], decision };
}

function activityReason(activity: CommentEvidence["activities"][number]): string {
  const prefix = `Pour « ${activity.label} »`;
  if (!activity.classification)
    return `${prefix}, la classification de l’espèce n’est pas résolue ; les types d’impact possibles ne peuvent pas être déterminés de manière fiable.`;
  if (activity.candidates.length > 1)
    return `${prefix}, le référentiel conservé pour cette revue propose plusieurs types d’impact : ${activity.candidates.map((c) => `« ${c.label} » (${c.code})`).join(" ; ")}. La préparation n’a retenu aucun type d’impact pour cette activité.`;
  if (activity.candidates.length === 0)
    return `${prefix}, aucune correspondance de libellé n’a été trouvée dans le référentiel conservé pour cette revue, pour la classification « ${activity.classification} ». Cela n’exclut pas qu’un type d’impact existant convienne après interprétation.`;
  return `${prefix}, une correspondance de libellé existe dans le référentiel consulté : « ${activity.candidates[0].label} » (${activity.candidates[0].code}), mais l’inventaire signale cette activité comme non résolue. Vérifier la préparation avant de valider ce choix.`;
}

function sourceFacts(source: CommentEvidence, activities: CommentEvidence["activities"]) {
  const facts = activities.map(
    (a) => `Activité Onagre : ${a.label}${a.classification ? ` (${a.classification})` : ""}.`,
  );
  if (source.method) facts.push(`Méthode Onagre : « ${source.method} ».`);
  for (const [label, text] of [
    ["Texte de l’activité", source.activityText],
    ["Description libre", source.descriptionText],
    ["Précision libre", source.precisionText],
  ])
    if (text?.trim()) facts.push(`${label} : « ${text.trim()} »`);
  return facts;
}
