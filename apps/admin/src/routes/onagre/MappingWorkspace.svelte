<script lang="ts">
  import type { OnagreActivities } from "@pitchou/types/onagreActivities.ts";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  import MappingFilters from "./MappingWorkspace/MappingFilters.svelte";
  import MappingEditor from "./MappingEditor.svelte";
  import MappingSidebar from "./MappingWorkspace/MappingSidebar.svelte";
  import MappingTable from "./MappingWorkspace/MappingTable.svelte";
  import { isComplete, compareMappings, normalize, mappingLink, type Target } from "./mappings.ts";
  import "./mapping.css";
  let {
    mappings,
    targets,
    writable,
    tables,
    activityWorkspace = null,
  }: {
    mappings: OnagreMapping[];
    targets: Target[];
    writable: boolean;
    tables: OnagreTable[];
    activityWorkspace?: OnagreActivities | null;
  } = $props();
  let url = $derived(page.shallow?.url ?? page.url);
  let search = $derived(url.searchParams.get("mappingSearch") ?? "");
  let section = $derived(url.searchParams.get("mappingTable") ?? "");
  let status = $derived(url.searchParams.get("mappingStatus") ?? "");
  let kind = $derived(url.searchParams.get("mappingKind") ?? "");
  let selected = $derived(mappings.find((m) => m.key === url.searchParams.get("mapping")));
  let message = $state("");
  let complete = $derived(mappings.filter(isComplete).length);
  let matches = $derived(
    mappings.filter(
      (m) =>
        (!section || m.section === section) &&
        (!kind || (kind === "proposal" ? Boolean(m.proposal) : m.key.startsWith(`${kind}:`))) &&
        normalize(
          `${m.section} ${m.label} ${m.context} ${m.proposal} ${m.rule} ${m.notes} ${m.target}`,
        ).includes(normalize(search)),
    ),
  );
  let filtered = $derived(
    matches.filter((m) => !status || m.status === status).toSorted(compareMappings),
  );
  let pages = $derived(Math.max(1, Math.ceil(filtered.length / 25)));
  let currentPage = $derived(
    Math.min(pages, Math.max(1, Math.floor(Number(url.searchParams.get("mappingPage"))) || 1)),
  );
  let index = $derived(filtered.findIndex((m) => m.key === selected?.key));
  function navigate(changes: Record<string, string | null>) {
    void goto(mappingLink(url, changes), { shallow: true, replace: true, reset: false });
  }
  function filter(changes: Record<string, string | null>) {
    navigate({ ...changes, mappingPage: null });
  }
  function open(key: string | null) {
    const rowIndex = filtered.findIndex((mapping) => mapping.key === key);
    navigate({
      mapping: key,
      ...(rowIndex >= 0 ? { mappingPage: String(Math.floor(rowIndex / 25) + 1) } : {}),
    });
  }
  function saved(next?: string) {
    message = "Décision enregistrée.";
    if (next) open(next);
  }
</script>

{#if message}<div class="mapping-feedback" role="status">
    {message}<button
      type="button"
      onclick={() => (message = "")}
      aria-label="Masquer la confirmation">Fermer</button
    >
  </div>{/if}
<div class="mapping-workspace">
  <MappingSidebar {mappings} {section} onSelect={(value) => filter({ mappingTable: value })} />
  <section class="mapping-catalog" aria-label="Correspondances">
    <div class="mapping-catalog-heading">
      <h2>{section || "Toutes les tables"}</h2>
      <div class="mapping-progress">
        <span><strong>{complete}</strong> / {mappings.length} décisions prises au total</span>
        <div
          role="progressbar"
          aria-label="Correspondances décidées"
          aria-valuenow={complete}
          aria-valuemin={0}
          aria-valuemax={mappings.length || 1}
        >
          <span style:width={`${mappings.length ? (complete / mappings.length) * 100 : 0}%`}></span>
        </div>
      </div>
    </div>
    <MappingFilters {search} {status} {kind} {matches} onChange={filter} />
    {#if filtered.length}
      {#key `${section}:${search}:${status}:${kind}:${currentPage}`}<MappingTable
          activities={activityWorkspace?.activities ?? []}
          mappings={filtered.slice((currentPage - 1) * 25, currentPage * 25)}
          onSelect={open}
        />{/key}
      <nav class="mapping-pagination" aria-label="Pagination des correspondances">
        <span
          >{(currentPage - 1) * 25 + 1} à {Math.min(currentPage * 25, filtered.length)} sur {filtered.length}</span
        >
        <div>
          <button
            type="button"
            disabled={currentPage === 1}
            onclick={() => navigate({ mappingPage: String(currentPage - 1) })}>Précédente</button
          ><span>{currentPage} / {pages}</span><button
            type="button"
            disabled={currentPage === pages}
            onclick={() => navigate({ mappingPage: String(currentPage + 1) })}>Suivante</button
          >
        </div>
      </nav>
    {:else}
      <div class="mapping-empty">
        <h3>Aucune correspondance trouvée</h3>
        <p>Essayez un autre terme ou retirez les filtres.</p>
        <button
          class="fr-btn fr-btn--secondary"
          type="button"
          onclick={() =>
            filter({
              mappingSearch: null,
              mappingTable: null,
              mappingStatus: null,
              mappingKind: null,
            })}>Réinitialiser les filtres</button
        >
      </div>
    {/if}
  </section>
</div>
{#if selected}
  {#key `${selected.key}:${selected.version}`}
    <MappingEditor
      {activityWorkspace}
      mapping={selected}
      {targets}
      {writable}
      table={tables.find((t) => t.name === selected.section)}
      previous={index > 0 ? filtered[index - 1]?.key : undefined}
      next={index >= 0 ? filtered[index + 1]?.key : undefined}
      position={index >= 0 ? `${index + 1} / ${filtered.length}` : "Hors des filtres actifs"}
      onSelect={open}
      onClose={() => open(null)}
      onSaved={saved}
    />
  {/key}
{/if}
