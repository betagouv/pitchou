<script lang="ts">
  import "./users-controls.css";
  import ListToolbar from "#lib/components/ListToolbar.svelte";
  import UsersFilterPanel from "./UsersFilterPanel.svelte";
  import { SORT_OPTIONS, type groupFilterOptions, type parseQuery, type SortKey } from "./list.ts";
  let {
    query,
    groupeOptions,
    updateQuery,
  }: {
    query: ReturnType<typeof parseQuery>;
    groupeOptions: ReturnType<typeof groupFilterOptions>;
    updateQuery: (values: Record<string, string>) => void;
  } = $props();
  let filterOpen = $state(false);
  let sortOpen = $state(false);
  const filterCount = $derived(Number(!!query.groupe) + Number(!!query.profile));

  function sortBy(key: SortKey) {
    const order =
      query.sort === key
        ? query.order === "asc"
          ? "desc"
          : "asc"
        : key === "last_login" || key === "groups"
          ? "desc"
          : "asc";
    updateQuery({ tri: key, ordre: order });
  }
</script>

<div class="users-controls flex flex-col gap-2">
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-[1_1_25rem]">
      <ListToolbar
        id="user-search"
        label="Rechercher un utilisateur"
        placeholder="Rechercher par nom, e-mail ou groupe…"
        value={query.search}
        onSearch={(q) => updateQuery({ q })}
        filterId="users-filters"
        sortId="users-sort"
        bind:filterOpen
        bind:sortOpen
        {filterCount}
      />
    </div>
    {#if query.search || filterCount}<button
        type="button"
        class="clear-filters"
        onclick={() => updateQuery({ q: "", groupe: "", profil: "" })}>Réinitialiser</button
      >{/if}
  </div>
  {#if filterOpen}
    <UsersFilterPanel {query} {groupeOptions} {updateQuery} />
  {/if}
  {#if sortOpen}
    <div id="users-sort" class="sort-panel" role="group" aria-label="Trier les utilisateurs">
      {#each SORT_OPTIONS as option (option.key)}
        <button
          type="button"
          aria-pressed={query.sort === option.key}
          onclick={() => sortBy(option.key)}
        >
          {option.label}
          {#if query.sort === option.key}
            <span
              class={query.order === "asc"
                ? "fr-icon-arrow-up-line fr-icon--sm"
                : "fr-icon-arrow-down-line fr-icon--sm"}
              aria-hidden="true"
            ></span>
            <span class="sr-only"
              >{query.order === "asc" ? "Ordre croissant" : "Ordre décroissant"}</span
            >
          {/if}
        </button>
      {/each}
      <span class="sort-hint">Cliquez à nouveau pour inverser l'ordre.</span>
    </div>
  {/if}
</div>
