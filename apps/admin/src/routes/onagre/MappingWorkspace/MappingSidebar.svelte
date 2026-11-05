<script lang="ts">
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  import { isComplete, normalize } from "../mappings.ts";
  let {
    mappings,
    section,
    onSelect,
  }: { mappings: OnagreMapping[]; section: string; onSelect: (value: string) => void } = $props();
  let search = $state("");
  let expanded = $state(false);
  function select(value: string) {
    onSelect(value);
    expanded = false;
  }
  let sections = $derived(
    [...new Set(mappings.map((m) => m.section))].sort((a, b) => a.localeCompare(b, "fr")),
  );
  let visible = $derived(sections.filter((name) => normalize(name).includes(normalize(search))));
</script>

<aside class="mapping-sidebar" aria-label="Tables Onagre">
  <button
    type="button"
    class="mapping-sidebar-toggle"
    aria-expanded={expanded}
    aria-controls="mapping-table-navigation"
    onclick={() => (expanded = !expanded)}
  >
    {section || "Toutes les tables"}<span
      class="fr-icon-arrow-down-s-line fr-icon--sm"
      aria-hidden="true"
    ></span>
  </button>
  <div id="mapping-table-navigation" class="mapping-sidebar-body" class:expanded>
    <div class="mapping-sidebar-heading">
      <h3>Tables Onagre <span>{sections.length}</span></h3>
      <input
        class="fr-input"
        type="search"
        aria-label="Rechercher une table"
        placeholder="Rechercher une table…"
        bind:value={search}
      />
    </div>
    <button
      type="button"
      class="mapping-all-tables"
      aria-current={!section ? "true" : undefined}
      onclick={() => select("")}>Toutes les tables <span>{mappings.length}</span></button
    >
    <p class="mapping-sidebar-caption">Décidées / total</p>
    <nav class="mapping-section-list" aria-label="Choisir une table">
      {#each visible as name}
        {@const rows = mappings.filter((m) => m.section === name)}
        {@const complete = rows.filter(isComplete).length}
        <button
          type="button"
          aria-current={section === name ? "true" : undefined}
          onclick={() => select(name)}
          ><span>{name}</span><small>{complete} / {rows.length}</small><span
            class="mapping-table-progress"
            ><span style:width={`${(complete / rows.length) * 100}%`}></span></span
          ></button
        >
      {:else}<p class="mapping-empty">Aucune table trouvée.</p>{/each}
    </nav>
  </div>
</aside>
