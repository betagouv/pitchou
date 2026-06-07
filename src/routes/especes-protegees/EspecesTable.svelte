<script lang="ts">
  import type { EspèceProtégée } from "$types/especes.d.ts";
  import { firstName } from "./especesList.ts";
  import EspecesSynonymesModale from "./EspecesSynonymesModale.svelte";

  type Props = {
    especes: EspèceProtégée[];
  };

  let { especes }: Props = $props();

  const synonymesModaleId = "modale-synonymes-especes";

  // Espèce whose synonyms are shown in the shared modal, set when a count badge is clicked
  let especeSynonymes: EspèceProtégée | null = $state(null);
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
          <tr>
            <td>
              {#if espece.espèceCNPN}
                <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</p>
              {/if}
              {#if espece.espèceMinistérielle}
                <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</p>
              {/if}
              <i>{firstName(espece.nomsScientifiques)}</i>
              {#if espece.nomsScientifiques.size > 1}
                <button
                  type="button"
                  class="synonymes-badge fr-badge fr-badge--sm"
                  aria-controls={synonymesModaleId}
                  data-fr-opened="false"
                  title="Voir les {espece.nomsScientifiques.size - 1} autres noms scientifiques"
                  onclick={() => (especeSynonymes = espece)}
                >
                  +{espece.nomsScientifiques.size - 1}
                </button>
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

  <EspecesSynonymesModale id={synonymesModaleId} espece={especeSynonymes} />
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

  .synonymes-badge {
    margin-left: 0.5rem;
    cursor: pointer;
  }
</style>
