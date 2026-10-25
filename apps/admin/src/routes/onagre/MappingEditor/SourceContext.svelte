<script lang="ts">
  import { page } from "$app/state";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  let { mapping, table }: { mapping: OnagreMapping; table?: OnagreTable } = $props();
  let showOriginal = $state(false);
  let field = $derived(
    mapping.key.startsWith("field:") ? mapping.key.slice(`field:${mapping.section}.`.length) : null,
  );
  let samples = $derived(
    field && table
      ? table.samples
          .map((row) => row[field!])
          .filter((value) => value != null && value.trim() !== "")
      : [],
  );
  let url = $derived(page.shallow?.url ?? page.url);
  let dumpUrl = $derived(
    `?${new URLSearchParams({ tab: "dump", snapshot: url.searchParams.get("snapshot") ?? "", table: mapping.section, ...(field ? { columns: JSON.stringify([field]) } : {}) })}`,
  );
</script>

<aside class="mapping-source-context" aria-label="Information source">
  <div class="mapping-source-heading">
    <span class="mapping-eyebrow">ONAGRE · {field ? "CHAMP" : "VALEUR DE RÉFÉRENCE"}</span><span
      class="mapping-source-table">{mapping.section}</span
    >
    <h3>{mapping.label}</h3>
  </div>
  {#if mapping.context}<p class="mapping-source-description">{mapping.context}</p>{/if}
  {#if mapping.proposal}<section class="mapping-proposal-card">
      <button
        type="button"
        class="mapping-original-toggle"
        aria-expanded={showOriginal}
        aria-controls="mapping-original-proposal"
        onclick={() => (showOriginal = !showOriginal)}
      >
        Proposition d'origine<span
          class={showOriginal
            ? "fr-icon-arrow-up-s-line fr-icon--sm"
            : "fr-icon-arrow-down-s-line fr-icon--sm"}
          aria-hidden="true"
        ></span>
      </button>
      {#if showOriginal}<div id="mapping-original-proposal">
          <p class:muted={!mapping.proposal}>
            {mapping.proposal}
          </p>
          {#if mapping.confidence}<span class="mapping-confidence"
              >Confiance indiquée · {mapping.confidence}</span
            >{/if}
        </div>{/if}
    </section>{/if}
  {#if samples.length}<section class="mapping-samples">
      <h4>Exemples du dump</h4>
      <p class="onagre-context">Valeurs renseignées parmi les premières lignes de la table.</p>
      <ol>
        {#each samples as sample}<li>{sample}</li>{/each}
      </ol>
    </section>{/if}
  <a class="mapping-dump-link" href={dumpUrl} target="_blank" rel="noreferrer"
    >Explorer cette table<span class="fr-sr-only">, nouvel onglet</span></a
  >
</aside>
