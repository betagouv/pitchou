<script lang="ts">
  import type { BdcStatutRow } from "./bdcStatutsList.ts";

  type Props = {
    rows: BdcStatutRow[];
  };

  let { rows }: Props = $props();
</script>

{#if rows.length >= 1}
  <div class="fr-table fr-table--bordered fr-table--layout-fixed">
    <table>
      <colgroup>
        <col style="width: 100px" />
        <col style="width: 100px" />
        <col />
        <col style="width: 120px" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">CD_NOM</th>
          <th scope="col">CD_REF</th>
          <th scope="col">Nom scientifique</th>
          <th scope="col">Type de statut</th>
          <th scope="col">Libellé</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td>{row.cd_nom}</td>
            <td>{row.cd_ref}</td>
            <td><i>{row.nom_scientifique ?? ""}</i></td>
            <td>{row.cd_type_statut}</td>
            <td>{row.label_statut}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p>Aucun statut ne correspond à cette recherche.</p>
{/if}

<style lang="scss">
  // Below ~768px the table keeps its min-width and the container scrolls horizontally
  .fr-table {
    overflow-x: auto;
  }

  .fr-table table {
    width: 100%;
    min-width: 52rem;
  }
</style>
