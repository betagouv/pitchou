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
        <col />
        <col />
        <col style="width: 7rem" />
        <col />
        <col style="width: 11rem" />
        <col style="width: 100px" />
        <col style="width: 100px" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Nom scientifique</th>
          <th scope="col">Nom vernaculaire</th>
          <th scope="col">Statuts</th>
          <th scope="col">Libellé</th>
          <th scope="col">Document</th>
          <th scope="col">CD_NOM</th>
          <th scope="col">CD_REF</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td><i>{row.nom_scientifique ?? ""}</i></td>
            <td>{row.nom_vernaculaire ?? ""}</td>
            <td>{row.cd_type_statut}</td>
            <td>{row.label_statut}</td>
            <td>
              {#if row.doc_url}
                <a
                  href={row.doc_url}
                  target="_blank"
                  rel="noopener external"
                  title={`${row.full_citation} – nouvelle fenêtre`}>Consulter</a
                >
              {:else}
                {row.full_citation}
              {/if}
            </td>
            <td>{row.cd_nom}</td>
            <td>{row.cd_ref}</td>
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
    min-width: 62rem;
  }
</style>
