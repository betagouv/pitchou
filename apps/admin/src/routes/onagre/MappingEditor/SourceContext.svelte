<script lang="ts">
  import { page } from "$app/state";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  let { mapping, table }: { mapping: OnagreMapping; table?: OnagreTable } = $props();
  let showOriginal = $state(false);
  let field = $derived(
    mapping.key.startsWith("field:") ? mapping.key.slice(`field:${mapping.section}.`.length) : null,
  );
  let samples = $state<string[]>([]);
  let loading = $state(false);
  let failed = $state(false);
  let complete = $state(true);
  let retry = $state(0);
  let url = $derived(page.shallow?.url ?? page.url);
  let dumpUrl = $derived(
    `?${new URLSearchParams({ tab: "dump", snapshot: url.searchParams.get("snapshot") ?? "", table: mapping.section, ...(field ? { columns: JSON.stringify([field]) } : {}) })}`,
  );
  $effect(() => {
    const params = new URLSearchParams({
      snapshot: url.searchParams.get("snapshot") ?? "",
      table: mapping.section,
      column: field ?? "",
    });
    void retry;
    samples = [];
    failed = false;
    if (!field || !table) return;
    const controller = new AbortController();
    loading = true;
    void fetch(`/onagre/examples?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Examples unavailable");
        const result = await response.json();
        if (!controller.signal.aborted) {
          samples = result.samples;
          complete = result.complete;
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) failed = true;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
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
  {#if field && table}<section class="mapping-samples" aria-busy={loading}>
      <h4>Exemples du dump</h4>
      {#if loading}<p role="status">Chargement des exemples…</p>
      {:else if failed}<p role="alert">Les exemples n'ont pas pu être chargés.</p>
        <button type="button" class="fr-btn fr-btn--tertiary" onclick={() => retry++}
          >Réessayer</button
        >
      {:else}
        <p class="onagre-context">
          {complete
            ? "Jusqu'à trois valeurs renseignées, dans l'ordre du dump."
            : "Exemples limités à l'échantillon. Chargez le dump complet pour chercher dans toutes les lignes."}
        </p>
        {#if samples.length}<ol>
            {#each samples as sample}<li>{sample}</li>{/each}
          </ol>{:else}<p>
            {complete
              ? "Aucune valeur renseignée dans ce champ."
              : "Aucune valeur renseignée dans l'échantillon."}
          </p>{/if}
      {/if}
    </section>{/if}
  <a class="mapping-dump-link" href={dumpUrl} target="_blank" rel="noreferrer"
    >Explorer cette table<span class="fr-sr-only">, nouvel onglet</span></a
  >
</aside>
