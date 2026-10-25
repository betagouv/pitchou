<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/state";
  import Select from "@pitchou/ui/Select.svelte";
  import type { OnagreActivities } from "@pitchou/types/onagreActivities.ts";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  import { activityMapping, suggestedActivity } from "@pitchou/common/onagre/activities.ts";
  import { normalize, statusLabels, isComplete, type Target } from "./mappings.ts";
  import MappingEditor from "./MappingEditor.svelte";
  import "./mapping.css";
  import "./activities.css";
  let {
    workspace,
    mappings,
    targets,
    tables,
    writable,
  }: {
    workspace: OnagreActivities;
    mappings: OnagreMapping[];
    targets: Target[];
    tables: OnagreTable[];
    writable: boolean;
  } = $props();
  let search = $state("");
  let status = $state("");
  let selected = $state<string | null>(untrack(() => page.url.searchParams.get("activity")));
  let currentPage = $state(1);
  let message = $state("");
  let all = $derived(
    mappings
      .filter(activityMapping)
      .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true })),
  );
  let filtered = $derived(
    all.filter(
      (mapping) =>
        (!status || mapping.status === status) &&
        normalize(
          [
            mapping.label,
            mapping.proposal,
            mapping.rule,
            mapping.notes,
            workspace.activities.find(
              (activity) => activity.code === suggestedActivity(mapping, workspace.activities),
            )?.label,
            ...workspace.rows
              .filter((row) => row.mappingKeys.includes(mapping.key))
              .flatMap((row) => [row.tracking, row.source, row.proposal, row.note]),
          ].join(" "),
        ).includes(normalize(search)),
    ),
  );
  let pages = $derived(Math.max(1, Math.ceil(filtered.length / 25)));
  let visible = $derived(filtered.slice((currentPage - 1) * 25, currentPage * 25));
  let complete = $derived(all.filter(isComplete).length);
  let mapping = $derived(all.find((item) => item.key === selected));
  let index = $derived(filtered.findIndex((item) => item.key === selected));
  let filters = $derived(JSON.stringify([search, status]));
  $effect(() => {
    if (filters) currentPage = 1;
  });
  $effect(() => {
    if (currentPage > pages) currentPage = pages;
  });
  function open(key: string | null) {
    selected = key;
    const position = filtered.findIndex((item) => item.key === key);
    if (position >= 0) currentPage = Math.floor(position / 25) + 1;
  }
  function saved(next?: string) {
    message = "Décision enregistrée dans les deux vues.";
    if (next) open(next);
  }
</script>

<section class="admin-panel activity-workspace">
  <header class="activity-heading">
    <div>
      <h2>Objets Onagre et activités Pitchou</h2>
      <p>Les mêmes décisions que dans Correspondances, avec le contexte du classeur.</p>
    </div>
    <div class="activity-progress">
      <strong>{complete} / {all.length}</strong><span>correspondances décidées</span><progress
        value={complete}
        max={all.length || 1}
      ></progress>
    </div>
  </header>
  <div class="activity-toolbar">
    <label class="onagre-field" for="activity-mapping-search"
      >Rechercher une correspondance<input
        id="activity-mapping-search"
        class="fr-input"
        placeholder="Objet, ancienne catégorie, activité, notes…"
        bind:value={search}
      /></label
    >
    <div class="onagre-field">
      <label for="activity-mapping-status">Avancement</label><Select
        id="activity-mapping-status"
        options={[
          { value: "", label: "Tous les statuts" },
          ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
        ]}
        bind:value={status}
      />
    </div>
  </div>
  {#if message}<p role="status" class="activity-message">{message}</p>{/if}
  {#if !workspace.documentId}<p class="activity-message" role="status">
      Le classeur complémentaire n'est pas encore chargé dans cette base.
    </p>{/if}
  <div class="activity-columns" aria-hidden="true">
    <span>Objet Onagre / ancien suivi</span><span>Ancien tableau de suivi</span><span
      >Activité Pitchou</span
    ><span>Avancement</span>
  </div>
  {#each visible as row (row.key)}
    {@const rows = workspace.rows.filter((item) => item.mappingKeys.includes(row.key))}
    {@const code = suggestedActivity(row, workspace.activities)}
    <button
      type="button"
      class="activity-row"
      data-mapping-key={row.key}
      onclick={() => open(row.key)}
    >
      <span
        ><strong>{row.label}</strong><small
          >{row.key.startsWith("worksheet:")
            ? "Sans objet Onagre identifié"
            : "Table objet du dump"}</small
        ></span
      >
      <span>{[...new Set(rows.map((item) => item.tracking).filter(Boolean))].join(", ")}</span>
      <span
        >{workspace.activities.find((activity) => activity.code === code)?.label ||
          code ||
          (row.status === "excluded"
            ? "Aucune reprise"
            : "À définir")}{#if code && !row.activity_code}<small>Suggestion à confirmer</small
          >{/if}</span
      >
      <span class="mapping-status" data-status={row.status}
        ><span></span>{statusLabels[row.status]}</span
      >
    </button>
  {:else}<p class="activity-message">Aucune correspondance ne correspond aux filtres.</p>{/each}
  <footer class="activity-pagination">
    <span>{filtered.length} correspondances</span><button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm"
      disabled={currentPage <= 1}
      onclick={() => currentPage--}>Précédente</button
    ><span>{currentPage} / {pages}</span><button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm"
      disabled={currentPage >= pages}
      onclick={() => currentPage++}>Suivante</button
    >
  </footer>
</section>
{#if mapping}
  {#key `${mapping.key}:${mapping.version}`}<MappingEditor
      {mapping}
      {targets}
      {writable}
      activityWorkspace={workspace}
      table={tables.find((table) => table.name === "objet")}
      previous={index > 0 ? filtered[index - 1]?.key : undefined}
      next={index >= 0 ? filtered[index + 1]?.key : undefined}
      position={index >= 0 ? `${index + 1} / ${filtered.length}` : "Hors des filtres actifs"}
      onSelect={open}
      onClose={() => open(null)}
      onSaved={saved}
    />{/key}
{/if}
