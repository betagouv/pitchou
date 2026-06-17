<script lang="ts">
  import type { TaxrefRow } from "./taxrefList.ts";

  type Props = {
    rows: TaxrefRow[];
  };

  let { rows }: Props = $props();
</script>

{#if rows.length >= 1}
  <div class="fr-table fr-table--bordered fr-table--layout-fixed">
    <table>
      <colgroup>
        <col style="width: 110px" />
        <col style="width: 110px" />
        <col />
        <col />
        <col style="width: 130px" />
        <col style="width: 130px" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">CD_NOM</th>
          <th scope="col">CD_REF</th>
          <th scope="col">Nom scientifique</th>
          <th scope="col">Nom vernaculaire</th>
          <th scope="col">Règne</th>
          <th scope="col">Classe</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td>{row.cd_nom}</td>
            <td>{row.cd_ref}</td>
            <td><i>{row.lb_nom}</i></td>
            <td>{row.nom_vern}</td>
            <td>{row.regne}</td>
            <td>{row.classe}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p>Aucun taxon ne correspond à cette recherche.</p>
{/if}

<style lang="scss">
  // Below ~768px the table keeps its min-width and the container scrolls horizontally
  .fr-table {
    overflow-x: auto;
  }

  .fr-table table {
    width: 100%;
    min-width: 48rem;
  }
</style>
