<script lang="ts">
  import type { BdcStatutRow } from "./bdcStatutsList.ts";
  import EspecesStatusBadge from "$lib/components/EspecesStatusBadge.svelte";
  import { LIBELLES_STATUT_LISTE_ROUGE } from "@pitchou/common/especes/listeRouge.ts";

  type Props = {
    rows: BdcStatutRow[];
  };

  let { rows }: Props = $props();
</script>

{#if rows.length >= 1}
  <div class="fr-table fr-table--bordered fr-table--layout-fixed overflow-x-auto">
    <table class="w-full min-w-[72rem]">
      <colgroup>
        <col style="width: 24rem" />
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
            <td>
              <span class="flex flex-wrap items-center gap-2">
                {#if row.statutListeRouge}
                  <EspecesStatusBadge
                    label={LIBELLES_STATUT_LISTE_ROUGE[row.statutListeRouge]}
                    tone={row.statutListeRouge}
                  />
                {/if}
                <i>{row.nom_scientifique ?? ""}</i>
              </span>
            </td>
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
