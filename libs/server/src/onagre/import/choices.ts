import type { OnagreMapping, SourceRow } from "@pitchou/types/onagre.ts";
import type { OnagreImportPlan } from "@pitchou/types/onagreImport.ts";
import type { FrozenInput, Source } from "./state.ts";
import { fieldRules, implementedDecision, motifChoice, referenceChoices } from "./decisions.ts";

export type Planning = {
  source: Source;
  mappings: OnagreMapping[];
  activities: FrozenInput["activities"];
  plan: OnagreImportPlan;
  omissions: string[];
  issues: string[];
};

export function addField(
  ctx: Planning,
  column: keyof OnagreImportPlan["columns"],
  value: string,
  sources: string[],
  mappings: OnagreMapping[],
) {
  ctx.plan.columns[column] = value;
  ctx.plan.fields.push({
    target: `dossier.${column}`,
    value,
    sources,
    mappings: mappings.map(({ key, version }) => ({ key, version })),
  });
}

export function fieldDecision(ctx: Planning, key: keyof typeof fieldRules, target: string) {
  const mapping = ctx.mappings.find((row) => row.key === key);
  if (implementedDecision(mapping, target, fieldRules[key])) return mapping!;
  ctx.omissions.push(
    `${key.slice(6)} : correspondance non validée ou règle différente de la transformation implémentée.`,
  );
  return null;
}

export function sourceReference(ctx: Planning, table: string, id: string): SourceRow | null {
  const rows = ctx.source.references?.[table] ?? [];
  if (rows.length === 1) return rows[0];
  ctx.issues.push(`${table} #${id} : référence absente ou ambiguë dans le dump.`);
  return null;
}

function referenceDecision(ctx: Planning, table: "objet" | "motifderogation", id: string) {
  const choices = referenceChoices(table, id);
  const validated = choices.flatMap((choice) => {
    const mapping = ctx.mappings.find(
      (row) => row.key === choice.key && row.status === "validated",
    );
    return mapping ? [{ mapping, label: choice.label }] : [];
  });
  if (validated.length !== 1) {
    ctx.omissions.push(
      `${table} #${id} : aucune correspondance validée unique. Valeur conservée dans la source.`,
    );
    return null;
  }
  const row = sourceReference(ctx, table, id);
  if (!row) return null;
  if (row[`lib${table}`] !== validated[0].label) {
    ctx.omissions.push(
      `${table} #${id} : libellé différent de celui du classeur revu. Correspondance à vérifier.`,
    );
    return null;
  }
  return validated[0].mapping;
}

export function planActivity(ctx: Planning) {
  const id = ctx.source.projet.objetid;
  if (!id?.trim()) return;
  const mapping = referenceDecision(ctx, "objet", id);
  if (!mapping) return;
  const activity = ctx.activities.find((row) => row.code === mapping.activity_code && row.usable);
  if (
    !activity ||
    !implementedDecision(
      mapping,
      "dossier.main_activite",
      `Choisir l'activité Pitchou « ${activity.code} » pour cet objet Onagre.`,
    )
  ) {
    ctx.omissions.push(`objet #${id} : activité ou règle non prise en charge par ce profil.`);
    return;
  }
  // Pitchou stores the label, and resolves its code through activite_label.
  addField(
    ctx,
    "main_activite",
    activity.label,
    ["projet.objetid", `objet#${id}.libobjet`],
    [mapping],
  );
}

export function planMotif(ctx: Planning) {
  const id = ctx.source.demande.motifderogationid;
  if (!id?.trim()) return;
  const field = fieldDecision(ctx, "field:demandes.motifderogationid", "dossier.motif_derogation");
  if (!field) return;
  const mapping = referenceDecision(ctx, "motifderogation", id);
  if (!mapping) return;
  const choice = motifChoice(id);
  if (
    !choice ||
    !implementedDecision(
      mapping,
      "dossier.motif_derogation",
      `Pour motifderogationid = ${id}, choisir le motif Pitchou « ${choice} ».`,
    )
  ) {
    ctx.omissions.push(`motifderogation #${id} : règle non prise en charge par ce profil.`);
    return;
  }
  addField(
    ctx,
    "motif_derogation",
    choice,
    ["demandes.motifderogationid", `motifderogation#${id}.libmotifderogation`],
    [field, mapping],
  );
}
