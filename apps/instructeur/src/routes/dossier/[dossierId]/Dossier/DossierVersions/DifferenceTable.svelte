<script lang="ts">
  import type { DemandeDifference } from "@pitchou/types/demandeComparison.ts";
  import ComparisonValue from "./ComparisonValue.svelte";
  let {
    differences,
    leftLabel,
    rightLabel,
  }: { differences: DemandeDifference[]; leftLabel: string; rightLabel: string } = $props();
  const labels = { added: "Ajouté", removed: "Retiré", changed: "Modifié" };
</script>

<p role="status" class="fr-mb-2w font-bold">
  {differences.length === 0
    ? "Aucune différence dans les données comparées."
    : `${differences.length} différence${differences.length > 1 ? "s" : ""}`}
</p>
{#if differences.length > 0}
  <p class="fr-text--sm text-[var(--text-mention-grey)]">Seules les différences sont affichées.</p>
  <div class="overflow-x-auto rounded-lg border border-[var(--border-default-grey)]">
    <table class="w-full min-w-[40rem] table-fixed border-collapse">
      <caption class="fr-sr-only">Comparaison des deux états sélectionnés</caption>
      <thead
        ><tr
          ><th scope="col" class="w-1/4">Élément</th><th scope="col"
            ><span class="column-label">État de référence</span>{leftLabel}</th
          ><th scope="col"><span class="column-label">État comparé</span>{rightLabel}</th></tr
        ></thead
      >
      <tbody
        >{#each differences as difference}
          <tr>
            <th scope="row"
              ><span class="fr-badge fr-badge--sm fr-mb-1w">{labels[difference.kind]}</span><br
              /><span class="block text-sm text-[var(--text-mention-grey)]"
                >{difference.path.slice(0, -1).join(" › ")}</span
              ><span class="font-bold">{difference.path.at(-1)}</span></th
            >
            <td class="reference-value"><ComparisonValue value={difference.left} /></td>
            <td class="compared-value"
              ><ComparisonValue value={difference.right} />{#if difference.detail}<p
                  class="font-bold"
                >
                  {difference.detail}
                </p>{/if}</td
            >
          </tr>
        {/each}</tbody
      >
    </table>
  </div>
{/if}

<style>
  th,
  td {
    padding: 1rem;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    border-bottom: 1px solid var(--border-default-grey);
  }
  thead {
    background: var(--background-contrast-grey);
  }
  tbody th {
    font-weight: normal;
  }
  .column-label {
    display: block;
    font-size: 0.75rem;
    font-weight: normal;
    color: var(--text-mention-grey);
    margin-bottom: 0.5rem;
  }
  .reference-value {
    border-left: 3px solid var(--border-default-grey);
  }
  .compared-value {
    background: var(--background-contrast-blue-france);
    border-left: 3px solid var(--border-action-high-blue-france);
  }
</style>
