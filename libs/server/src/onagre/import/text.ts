import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { addField, fieldDecision, sourceReference, type Planning } from "./choices.ts";

export function planText(ctx: Planning) {
  const sections: string[] = [],
    sources: string[] = [],
    mappings: OnagreMapping[] = [];
  for (const [column, label] of [
    ["lieux", "Lieux des opérations, Onagre"],
    ["periodes", "Périodes souhaitées, Onagre"],
  ] as const) {
    const value = ctx.source.demande[column];
    if (!value?.trim()) continue;
    const mapping = fieldDecision(ctx, `field:demandes.${column}`, "dossier.description");
    if (!mapping) continue;
    sections.push(`${label}\n${value}`);
    sources.push(`demandes.${column}`);
    mappings.push(mapping);
  }
  const id = ctx.source.projet.servicecoordinateurid;
  if (id?.trim()) {
    const mapping = fieldDecision(ctx, "field:projet.servicecoordinateurid", "dossier.description");
    if (mapping) {
      const service = sourceReference(ctx, "services", id);
      if (service?.nomservice?.trim()) {
        sections.push(`Service coordinateur du projet, Onagre\n${service.nomservice}`);
        sources.push("projet.servicecoordinateurid", `services#${id}.nomservice`);
        mappings.push(mapping);
      } else if (service) ctx.omissions.push(`Service coordinateur #${id} : nom absent.`);
    }
  }
  if (sections.length > 0) addField(ctx, "description", sections.join("\n\n"), sources, mappings);
  const value = ctx.source.demande.solutionsalternatives;
  if (value?.trim()) {
    const mapping = fieldDecision(
      ctx,
      "field:demandes.solutionsalternatives",
      "dossier.no_other_satisfactory_solution_justification",
    );
    if (mapping)
      addField(
        ctx,
        "no_other_satisfactory_solution_justification",
        value,
        ["demandes.solutionsalternatives"],
        [mapping],
      );
  }
}
