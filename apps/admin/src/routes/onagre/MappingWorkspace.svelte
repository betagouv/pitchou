<script lang="ts">
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  import MappingEditor from "./MappingEditor.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  let {
    mappings,
    targets,
    writable,
  }: {
    mappings: OnagreMapping[];
    targets: { table_name: string; column_name: string; data_type: string }[];
    writable: boolean;
  } = $props();
  let search = $state("");
  let section = $state("");
  let status = $state("");
  let selectedKey = $state("");
  let limit = $state(50);
  const labels: Record<string, string> = {
    todo: "À traiter",
    discuss: "À discuter",
    validated: "Validée",
    excluded: "Exclue",
  };
  let sections = $derived([...new Set(mappings.map((m) => m.section))].sort());
  let filtered = $derived(
    mappings.filter(
      (m) =>
        (!section || m.section === section) &&
        (!status || m.status === status) &&
        `${m.label} ${m.context} ${m.proposal} ${m.rule} ${m.notes} ${m.target}`
          .toLocaleLowerCase("fr")
          .includes(search.toLocaleLowerCase("fr")),
    ),
  );
  let selected = $derived(mappings.find((m) => m.key === selectedKey));
</script>

<section class="admin-panel">
  <h2>Correspondances à décider</h2>
  <div class="onagre-controls">
    <label
      >Rechercher<input
        class="fr-input"
        bind:value={search}
        placeholder="Champ, proposition, commentaire…"
      /></label
    >
    <div class="onagre-field">
      <label for="mapping-section">Table source</label>
      <Select
        id="mapping-section"
        bind:value={section}
        options={[
          { value: "", label: "Toutes les tables" },
          ...sections.map((value) => ({ value, label: value })),
        ]}
      />
    </div>
    <div class="onagre-field">
      <label for="mapping-status-filter">Avancement</label>
      <Select
        id="mapping-status-filter"
        bind:value={status}
        options={[
          { value: "", label: "Tous les états" },
          ...Object.entries(labels).map(([value, label]) => ({ value, label })),
        ]}
      />
    </div>
  </div>
  <p>
    {filtered.length} correspondances · {mappings.filter((m) => m.proposal).length} propositions reprises
    du classeur
  </p>
</section>
<div class="onagre-split">
  <section class="admin-panel onagre-mapping-list" aria-label="Liste des correspondances">
    {#each filtered.slice(0, limit) as mapping}
      <button
        class:selected={selectedKey === mapping.key}
        onclick={() => {
          selectedKey = mapping.key;
        }}
      >
        <span class="onagre-mapping-title">{mapping.section} · {mapping.label}</span><span
          class="onagre-badge"
          data-status={mapping.status}>{labels[mapping.status]}</span
        >
        <span class="onagre-proposal"
          >{mapping.proposal || "Aucune proposition dans le classeur"}</span
        >
      </button>
    {:else}<p>Aucune correspondance pour ces filtres.</p>{/each}
    {#if filtered.length > limit}<button
        class="fr-btn fr-btn--secondary"
        onclick={() => (limit += 50)}>Afficher 50 correspondances de plus</button
      >{/if}
  </section>
  <section class="admin-panel onagre-editor" aria-label="Décision de correspondance">
    {#if selected}{#key `${selected.key}:${selected.version}`}<MappingEditor
          mapping={selected}
          {targets}
          {writable}
        />{/key}
    {:else}<h2>Choisir une correspondance</h2>
      <p>
        Sélectionnez un champ ou une valeur de référence pour lire la proposition de l'équipe et
        enregistrer une décision.
      </p>
      <p>Les propositions ambiguës et les lignes sans correspondance restent visibles.</p>{/if}
  </section>
</div>
