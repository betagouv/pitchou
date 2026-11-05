<script lang="ts">
  import type { OnagreImportPlan } from "@pitchou/types/onagreImport.ts";
  let { plan }: { plan?: OnagreImportPlan } = $props();
  const labels: Record<string, string> = {
    "dossier.main_activite": "Activité principale",
    "dossier.motif_derogation": "Motif de dérogation",
    "dossier.description": "Description",
    "dossier.no_other_satisfactory_solution_justification":
      "Justification des solutions alternatives",
  };
</script>

{#if plan?.fields.length}
  <details class="import-details">
    <summary
      >Valeurs prévues dans Pitchou · {plan.fields.length} champ{plan.fields.length > 1 ? "s" : ""} complémentaire{plan
        .fields.length > 1
        ? "s"
        : ""}</summary
    >
    {#each plan.fields as field}
      <div class="import-field">
        <strong>{labels[field.target] ?? field.target}</strong>
        <p class="import-field-value">{field.value}</p>
        <p class="onagre-context">Source · {field.sources.join(" · ")}</p>
        <p class="onagre-context">
          {#each field.mappings as mapping, index}
            {index ? " · " : ""}<a
              href={`?tab=correspondances&mapping=${encodeURIComponent(mapping.key)}`}
            >
              {mapping.key} · version {mapping.version}
            </a>
          {/each}
        </p>
      </div>
    {/each}
  </details>
{:else if plan}
  <p class="onagre-context">Aucun champ complémentaire repris pour cette demande.</p>
{/if}

<style>
  .import-field {
    padding-block: 0.75rem;
    border-bottom: 1px solid var(--border-default-grey);
  }
  .import-field-value {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin-block: 0.5rem;
  }
</style>
