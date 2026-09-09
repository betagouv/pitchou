<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import { anomaliesHint, anomaliesTitle } from "@pitchou/common/impact_espece/anomalies.ts";

  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

  type Props = {
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
    makeFileContentBlob: () => Blob | Promise<Blob>;
    makeFilename: () => string;
  };

  let { anomalies, makeFileContentBlob, makeFilename }: Props = $props();

  let detailShown = $state(false);
</script>

{#snippet telecharger()}
  <DownloadButton
    {makeFileContentBlob}
    {makeFilename}
    classname="fr-link fr-icon-download-line fr-link--icon-left"
    label="Télécharger le fichier original"
  />
{/snippet}

{#snippet fichierOriginal()}
  <p class="fr-m-0">{@render telecharger()}</p>
{/snippet}

{#await anomalies}
  {@render fichierOriginal()}
{:then anomaliesFichier}
  {#if anomaliesFichier && anomaliesFichier.length >= 1}
    {@const hint = anomaliesHint(anomaliesFichier)}
    <div class="fr-alert fr-alert--warning fr-mb-2w" role="status">
      <div class="flex flex-row flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p class="fr-m-0 flex-1 min-w-0">
          <strong>{anomaliesTitle(anomaliesFichier)}</strong>{hint ? ` - ${hint}` : ""}
        </p>
        <div class="flex flex-row flex-wrap items-baseline gap-6">
          <button
            class="fr-link whitespace-nowrap"
            aria-expanded={detailShown}
            onclick={() => (detailShown = !detailShown)}
          >
            {detailShown ? "Masquer le détail" : "Voir le détail"}
          </button>
          {@render telecharger()}
        </div>
      </div>
      {#if detailShown}
        <ul class="fr-mt-2w fr-mb-0">
          {#each anomaliesFichier as anomalie}
            <li>
              {#if anomalie.classification && anomalie.ligne}
                Feuille « {anomalie.classification} », ligne {anomalie.ligne} :
              {/if}
              {anomalie.message}
            </li>
          {/each}
        </ul>
        <p class="fr-mt-1w fr-mb-0">
          <a
            href="/referentiel-type-impact"
            target="_blank"
            rel="noopener"
            title="Référentiel des types d'impact et de leurs critères - nouvelle fenêtre"
            class="fr-link fr-icon-question-line fr-link--icon-left fr-text--sm"
            >Quels types d'impact, méthodes et moyens de poursuite sont reconnus&nbsp;?</a
          >
        </p>
      {/if}
    </div>
  {:else}
    {@render fichierOriginal()}
  {/if}
{/await}
