<script lang="ts">
  import "./users-controls.css";
  import Select from "@pitchou/ui/Select.svelte";
  import { profiles } from "./model.ts";
  import { parseQuery, SORT_OPTIONS, type SortKey } from "./list.ts";
  let {
    query,
    updateQuery,
  }: {
    query: ReturnType<typeof parseQuery>;
    updateQuery: (values: Record<string, string>) => void;
  } = $props();
  let sortOpen = $state(false);
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

<div class="users-controls">
  <div class="filters">
    <div class="search-field">
      <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
      <label class="sr-only" for="user-search">Rechercher un utilisateur</label>
      <input
        id="user-search"
        type="search"
        placeholder="Rechercher par nom, e-mail ou groupe…"
        value={query.search}
        oninput={(event) => updateQuery({ q: event.currentTarget.value })}
        autocomplete="off"
      />
    </div>
    <Select
      id="user-profile-filter"
      ariaLabel="Filtrer par profil"
      class="profile-filter w-48 max-w-full text-sm"
      options={[
        { value: "", label: "Tous les profils" },
        ...Object.entries(profiles).map(([value, info]) => ({ value, label: info.label })),
      ]}
      value={query.profile}
      onChange={(value) => updateQuery({ profil: value })}
    />
    <button
      class="sort-toggle"
      type="button"
      aria-expanded={sortOpen}
      aria-controls="users-sort"
      onclick={() => (sortOpen = !sortOpen)}
    >
      <span class="fr-icon-list-ordered fr-icon--sm" aria-hidden="true"></span>
      Trier
      <span
        class:expanded={sortOpen}
        class="fr-icon-arrow-down-s-line fr-icon--sm"
        aria-hidden="true"
      ></span>
    </button>
    {#if query.search || query.profile}<button
        class="clear-filters"
        onclick={() => updateQuery({ q: "", profil: "" })}>Réinitialiser</button
      >{/if}
  </div>
  {#if sortOpen}
    <div id="users-sort" class="sort-panel" role="group" aria-label="Trier les utilisateurs">
      {#each SORT_OPTIONS as option}
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
