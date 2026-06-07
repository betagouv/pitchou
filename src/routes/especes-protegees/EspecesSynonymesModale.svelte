<script lang="ts">
  import type { EspèceProtégée } from "$types/especes.d.ts";

  type Props = {
    id: string;
    espece: EspèceProtégée | null;
  };

  let { id, espece }: Props = $props();

  const titreId = $derived(`${id}-title`);
  const nomsScientifiques = $derived(espece ? [...espece.nomsScientifiques] : []);
  const nomsVernaculaires = $derived(espece ? [...espece.nomsVernaculaires] : []);
</script>

<dialog {id} class="fr-modal" aria-labelledby={titreId}>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button class="fr-btn--close fr-btn" title="Fermer" aria-controls={id}>Fermer</button>
          </div>
          <div class="fr-modal__content">
            {#if espece}
              <h1 id={titreId} class="fr-modal__title">
                <i>{nomsScientifiques[0]}</i>
              </h1>

              {#if nomsScientifiques.length > 1}
                <h2 class="fr-h6 fr-mt-2w">Synonymes scientifiques</h2>
                <ul>
                  {#each nomsScientifiques.slice(1) as nom}
                    <li><i>{nom}</i></li>
                  {/each}
                </ul>
              {/if}

              {#if nomsVernaculaires.length >= 1}
                <h2 class="fr-h6 fr-mt-2w">Noms vernaculaires</h2>
                <ul>
                  {#each nomsVernaculaires as nom}
                    <li>{nom}</li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
