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
  const statuts = $derived(espece ? [...espece.CD_TYPE_STATUTS] : []);

  const STATUT_LABELS: Record<string, string> = {
    PN: "protection nationale",
    PR: "protection régionale",
    PD: "protection départementale",
    POM: "protection en outre-mer",
    "Protection Pitchou": "ajout maintenu par Pitchou",
  };
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

              {#if espece.espèceCNPN || espece.espèceMinistérielle}
                <p class="badges">
                  {#if espece.espèceCNPN}
                    <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</span>
                  {/if}
                  {#if espece.espèceMinistérielle}
                    <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</span>
                  {/if}
                </p>
              {/if}

              <ul class="infos">
                <li><strong>CD_REF</strong> : {espece.CD_REF}</li>
                <li><strong>Classification</strong> : {espece.classification}</li>
              </ul>

              <h2 class="fr-h6 fr-mt-2w">Statuts de protection</h2>
              {#if statuts.length >= 1}
                <ul>
                  {#each statuts as statut}
                    <li><strong>{statut}</strong> : {STATUT_LABELS[statut] ?? statut}</li>
                  {/each}
                </ul>
              {:else}
                <p>Aucun statut de protection enregistré.</p>
              {/if}

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

<style lang="scss">
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .infos {
    list-style: none;
    padding: 0;
    margin: 0;
  }
</style>
