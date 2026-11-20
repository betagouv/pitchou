<script lang="ts">
  import EspecesStatusBadge from "#lib/components/EspecesStatusBadge.svelte";
  import { impactColumns, impactRows, impactValues, type ImpactGroup } from "./impactGroups.ts";
  import { VALUE_NOT_PROVIDED } from "#lib/especes/especesByTypeImpact.ts";
  import { LIBELLES_STATUT_LISTE_ROUGE } from "@pitchou/common/especes/listeRouge.ts";

  let {
    group,
    pending = false,
    groupBySpecies = false,
  }: {
    group: ImpactGroup;
    pending?: boolean;
    groupBySpecies?: boolean;
  } = $props();
  const columns = $derived(impactColumns(group.impacts));
  const rows = $derived(impactRows(group.impacts, groupBySpecies));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll wide tables.) -->
<div class="table-scroll" tabindex="0" role="region" aria-label={group.label}>
  <table class:pending aria-label={group.label}>
    <thead>
      <tr>
        <th scope="col">Espèces</th>
        {#each columns as column (column.key)}
          <th scope="col" class:narrow={column.narrow}>{column.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as impacts}
        {@const impact = impacts[0]}
        {@const activities = [
          ...new Set(
            impacts.flatMap(({ onagreActivity }) => (onagreActivity ? [onagreActivity] : [])),
          ),
        ]}
        <tr>
          <td>
            <span class="species-name">
              <span>
                {impact.espece.nomVernaculaire}
                <i>({impact.espece.nomScientifique})</i>
              </span>
              {#if impact.espece.especeCNPN}<EspecesStatusBadge label="CNPN" />{/if}
              {#if impact.espece.especeMinisterielle}
                <EspecesStatusBadge label="MINISTÈRE" />
              {/if}
              {#if impact.espece.statutListeRouge}
                <EspecesStatusBadge
                  label={LIBELLES_STATUT_LISTE_ROUGE[impact.espece.statutListeRouge]}
                  tone={impact.espece.statutListeRouge}
                />
              {/if}
            </span>
            {#if groupBySpecies && activities.length > 0}
              <details>
                <summary>Activités Onagre</summary>
                <ul class="fr-m-0">
                  {#each activities as activity}<li>{activity}</li>{/each}
                </ul>
              </details>
            {/if}
          </td>
          {#each columns as column (column.key)}
            <td class:narrow={column.narrow}
              >{impactValues(impacts, column.key).join(" / ") || VALUE_NOT_PROVIDED}</td
            >
          {/each}
        </tr>
      {:else}
        <tr><td>Aucune espèce impactée dans ce groupe.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-scroll {
    min-width: 0;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border-default-grey, #ddd);
    font-size: 1rem;
    line-height: 1.5rem;
    color: var(--text-default-grey, #3a3a3a);
    background: var(--background-default-grey, #fff);
  }
  th,
  td {
    padding: 1rem;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid var(--border-default-grey, #ddd);
    overflow-wrap: anywhere;
    min-width: 7rem;
  }
  th {
    background: var(--background-alt-grey, #f6f6f6);
    font-weight: 700;
  }
  th:first-child {
    min-width: 15rem;
  }
  /* Numeric columns share one width, sized on the longest title ("Surface habitat
     détruit (m²)"), so they line up from one table to the next; the species column
     takes what is left. */
  .narrow {
    width: 18rem;
    min-width: 18rem;
    white-space: nowrap;
  }
  .species-name {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.5rem;
  }
  .pending,
  .pending th {
    background: #ffedbf;
  }
</style>
