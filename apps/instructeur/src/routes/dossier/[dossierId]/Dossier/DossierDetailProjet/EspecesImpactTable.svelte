<script lang="ts">
  import EspecesStatusBadge from "./EspecesStatusBadge.svelte";
  import { impactColumns, type ImpactGroup } from "./impactGroups.ts";
  import { VALUE_NOT_PROVIDED } from "$lib/especes/especesByTypeImpact.ts";

  let { group, pending = false }: { group: ImpactGroup; pending?: boolean } = $props();
  const columns = $derived(impactColumns(group.impacts));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll wide tables.) -->
<div class="table-scroll" tabindex="0" role="region" aria-label={group.label}>
  <table class:pending aria-label={group.label}>
    <thead>
      <tr>
        <th scope="col">Espèces</th>
        {#each columns as column (column.key)}<th scope="col">{column.label}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each group.impacts as impact}
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
            </span>
          </td>
          {#each columns as column (column.key)}
            <td>{impact[column.key] ?? VALUE_NOT_PROVIDED}</td>
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
    width: 55%;
    min-width: 15rem;
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
