<script lang="ts">
  import { tick } from "svelte";

  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  import { firstName } from "./especesList.ts";
  import EspecesSynonymesModal from "./EspecesSynonymesModal.svelte";

  type Props = {
    especes: EspeceProtegee[];
  };

  let { especes }: Props = $props();

  const detailModalId = "modale-detail-espece";

  // Espèce whose details are shown in the shared modal, set when a row is activated
  let especeDetail: EspeceProtegee | null = $state(null);
  let triggerDetail: HTMLButtonElement | undefined = $state();

  async function openDetail(espece: EspeceProtegee) {
    especeDetail = espece;
    await tick();
    triggerDetail?.click();
  }
</script>

{#if especes.length >= 1}
  <div class="fr-table fr-table--bordered fr-table--layout-fixed">
    <table>
      <colgroup>
        <col />
        <col />
        <col style="width: 150px" />
        <col style="width: 100px" />
        <col style="width: 100px" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Nom scientifique</th>
          <th scope="col">Nom vernaculaire</th>
          <th scope="col">Classification</th>
          <th scope="col">Statuts</th>
          <th scope="col">CD_REF</th>
        </tr>
      </thead>
      <tbody>
        {#each especes as espece (espece.CD_REF)}
          <tr
            class="clickable"
            role="button"
            tabindex="0"
            title="Voir le détail de {firstName(espece.nomsScientifiques)}"
            onclick={() => openDetail(espece)}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetail(espece);
              }
            }}
          >
            <td>
              {#if espece.espèceCNPN}
                <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</p>
              {/if}
              {#if espece.espèceMinistérielle}
                <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</p>
              {/if}
              <i>{firstName(espece.nomsScientifiques)}</i>
              {#if espece.nomsScientifiques.size > 1}
                <span
                  class="synonymes-badge fr-badge fr-badge--sm"
                  title="{espece.nomsScientifiques.size - 1} autre(s) nom(s) scientifique(s)"
                >
                  +{espece.nomsScientifiques.size - 1}
                </span>
              {/if}
            </td>
            <td>{firstName(espece.nomsVernaculaires)}</td>
            <td>{espece.classification}</td>
            <td>{[...espece.CD_TYPE_STATUTS].join(", ")}</td>
            <td>{espece.CD_REF}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <button
    bind:this={triggerDetail}
    type="button"
    class="fr-sr-only"
    aria-controls={detailModalId}
    data-fr-opened="false"
    tabindex="-1"
    aria-hidden="true"
  >
    Voir le détail
  </button>

  <EspecesSynonymesModal id={detailModalId} espece={especeDetail} />
{:else}
  <p>Aucune espèce protégée n'a été trouvée.</p>
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

  tr.clickable {
    cursor: pointer;
  }

  tr.clickable:hover {
    background-color: var(--background-contrast-grey);
  }

  tr.clickable:focus-visible {
    outline: 2px solid var(--bf500);
    outline-offset: -2px;
  }

  .synonymes-badge {
    margin-left: 0.5rem;
  }
</style>
