<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { page } from "$app/state";
  import { afterNavigate, beforeNavigate, goto } from "$app/navigation";
  import { onDestroy, untrack } from "svelte";
  import {
    commentCategories,
    commentOutcomes,
    type CommentWorkspace,
  } from "@pitchou/types/onagreComments.ts";
  import CommentEditor from "./CommentWorkspace/CommentEditor.svelte";
  import ReviewTable from "./CommentWorkspace/ReviewTable.svelte";
  import CategoryHelp from "./CommentWorkspace/CategoryHelp.svelte";
  let { workspace, writable }: { workspace: CommentWorkspace; writable: boolean } = $props();
  let category = $state(untrack(() => workspace.category));
  let outcome = $state(untrack(() => workspace.outcome));
  let search = $state(untrack(() => workspace.search));
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let filterUrl: string | undefined;

  function cancelSearch() {
    clearTimeout(searchTimer);
  }

  function applyFilters() {
    cancelSearch();
    filterUrl = new URL(
      link({ category, outcome, text: search || null, textPage: null, textGroup: null }),
      page.url.href,
    ).href;
    void goto(filterUrl, { replace: true, reset: false });
  }

  function scheduleSearch() {
    cancelSearch();
    searchTimer = setTimeout(applyFilters, 350);
  }

  beforeNavigate(({ to }) => {
    if (to?.url.href !== filterUrl) {
      cancelSearch();
      filterUrl = undefined;
    }
  });
  afterNavigate(({ to }) => {
    // Keep newer input when an earlier filter request finishes loading.
    if (to?.url.href !== filterUrl) {
      category = workspace.category;
      outcome = workspace.outcome;
      search = workspace.search;
    }
  });
  onDestroy(cancelSearch);
  function link(changes: Record<string, string | number | null>) {
    const params = new URLSearchParams(page.url.searchParams.toString());
    params.set("tab", "textes");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, String(value));
    }
    return `?${params}`;
  }
</script>

<section class="admin-stack" aria-label="Textes à reprendre">
  {#if workspace.categories.length === 0}<p role="status">
      L’inventaire des commentaires n’a pas encore été chargé dans cet environnement.
    </p>{/if}
  <form
    method="GET"
    class="onagre-controls"
    onsubmit={(event) => {
      event.preventDefault();
      applyFilters();
    }}
  >
    <input type="hidden" name="tab" value="textes" />
    {#if page.url.searchParams.get("snapshot")}<input
        type="hidden"
        name="snapshot"
        value={page.url.searchParams.get("snapshot")}
      />{/if}
    <div class="onagre-field">
      <label for="text-category">Information à examiner</label>
      <input type="hidden" name="category" value={category} />
      <Select
        id="text-category"
        bind:value={category}
        onChange={applyFilters}
        options={Object.entries(commentCategories).map(([value, label]) => ({
          value: value as typeof category,
          label:
            label +
            " (" +
            (workspace.categories.find((c) => c.category === value)?.count ?? 0) +
            ")",
        }))}
      />
    </div>
    <label
      >Rechercher une formulation<input
        class="fr-input"
        name="text"
        bind:value={search}
        oninput={scheduleSearch}
        maxlength="200"
        placeholder="capture manuelle, épuisette…"
      /></label
    >
    <div class="onagre-field">
      <label for="text-outcome">Avancement</label>
      <input type="hidden" name="outcome" value={outcome} />
      <Select
        id="text-outcome"
        bind:value={outcome}
        onChange={applyFilters}
        options={[
          { value: "all", label: "Tous" },
          ...Object.entries(commentOutcomes).map(([value, label]) => ({ value, label })),
        ]}
      />
    </div>
  </form>
  <CategoryHelp category={workspace.category} />
  <p>
    {workspace.total.toLocaleString("fr-FR")} groupes de formulations et contextes. Triés par nombre de
    demandes concernées.
  </p>
  <ReviewTable groups={workspace.groups} groupLink={(id) => link({ textGroup: id })} />
  <nav class="onagre-controls" aria-label="Pagination des textes">
    {#if workspace.page > 1}<a href={link({ textPage: workspace.page - 1, textGroup: null })}
        >Page précédente</a
      >{/if}
    <span
      >Page {workspace.page} sur {Math.max(
        1,
        Math.ceil(workspace.total / workspace.pageSize),
      )}</span
    >
    {#if workspace.page * workspace.pageSize < workspace.total}<a
        href={link({ textPage: workspace.page + 1, textGroup: null })}>Page suivante</a
      >{/if}
  </nav>
</section>
{#if workspace.selected}
  {#key `${workspace.selected.id}:${workspace.selected.decision?.version ?? 0}`}
    <CommentEditor
      group={workspace.selected}
      choices={workspace.choices}
      {writable}
      onClose={() => void goto(link({ textGroup: null }), { replace: true, reset: false })}
    />
  {/key}
{/if}
