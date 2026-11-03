<script lang="ts">
  import "./UserGroupPicker/styles.css";
  import { tick } from "svelte";
  import type { PageData } from "./$types";
  import { normalize } from "./model.ts";
  import SelectedGroups from "./UserGroupPicker/SelectedGroups.svelte";

  let {
    groups,
    selected = $bindable(),
  }: {
    groups: NonNullable<PageData["groups"]>;
    selected: string[];
  } = $props();
  let search = $state("");
  let searchInput = $state<HTMLInputElement>();
  const selectedGroups = $derived(groups.filter((group) => selected.includes(group.id)));
  const available = $derived(groups.filter((group) => !selected.includes(group.id)));
  const filtered = $derived(
    available.filter((group) => normalize(group.name).includes(normalize(search))),
  );
  const hasActiveGroup = $derived(selectedGroups.some((group) => group.active));

  async function changeGroup(id: string, include: boolean) {
    selected = include ? [...selected, id] : selected.filter((value) => value !== id);
    await tick();
    searchInput?.focus();
  }
</script>

<div class="user-group-picker">
  <SelectedGroups groups={selectedGroups} onRemove={(id) => changeGroup(id, false)} />
  {#if !hasActiveGroup}
    <p class="help warning">
      Aucun groupe actif sélectionné. Les accès individuels aux dossiers restent applicables.
    </p>
  {/if}
  <section aria-label="Groupes disponibles" class="available-groups">
    <h3>Ajouter des groupes</h3>
    <p class="help">
      Recherchez un groupe puis sélectionnez-le pour l'ajouter à la liste ci-dessus.
    </p>
    {#if groups.length}
      <label class="search-field">
        <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
        <input
          bind:this={searchInput}
          type="search"
          aria-label="Rechercher un groupe"
          placeholder="Rechercher un groupe…"
          bind:value={search}
          autocomplete="off"
          data-form-type="other"
          data-1p-ignore
          data-lpignore="true"
        />
      </label>
      <div class="group-list" role="group" aria-label="Choisir les groupes">
        {#each filtered as group (group.id)}
          <label class="group-option">
            <input
              type="checkbox"
              value={group.id}
              checked={false}
              aria-label={group.name}
              onchange={() => changeGroup(group.id, true)}
            />
            <span class="group-name">{group.name}</span>
            {#if !group.active}<span class="archived">Archivé</span>{/if}
          </label>
        {:else}
          <p class="empty">
            {available.length === 0
              ? "Tous les groupes sont sélectionnés."
              : "Aucun groupe ne correspond à la recherche."}
          </p>
        {/each}
      </div>
    {:else}
      <p class="help">Aucun groupe disponible. Créez un groupe sur la page Groupes instructeurs.</p>
    {/if}
  </section>
</div>
