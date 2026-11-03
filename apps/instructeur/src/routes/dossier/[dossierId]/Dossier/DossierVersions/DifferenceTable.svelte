<script lang="ts">
  import type { DemandeDifference } from "@pitchou/types/demandeComparison.ts";
  import ComparisonValue from "./ComparisonValue.svelte";
  let { differences }: { differences: DemandeDifference[] } = $props();
  const labels = { added: "Ajouté", removed: "Retiré", changed: "Modifié" };
</script>

<p role="status">
  {differences.length === 0
    ? "Aucune différence dans les données comparées."
    : `${differences.length} différence(s)`}
</p>
{#if differences.length > 0}
  <div class="overflow-x-auto">
    <table class="w-full table-fixed border-collapse">
      <caption class="fr-sr-only">Comparaison des deux états sélectionnés</caption>
      <thead
        ><tr
          ><th scope="col">Élément</th><th scope="col">À gauche</th><th scope="col">À droite</th
          ></tr
        ></thead
      >
      <tbody
        >{#each differences as difference}
          <tr>
            <th scope="row"
              ><span class="fr-badge fr-badge--sm fr-mb-1w">{labels[difference.kind]}</span><br
              />{difference.path.join(" › ")}</th
            >
            <td><ComparisonValue value={difference.left} /></td>
            <td
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
</style>
