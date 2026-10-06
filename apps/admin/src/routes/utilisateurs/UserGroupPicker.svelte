<script lang="ts">
  import type { PageData } from "./$types";

  let {
    groups,
    selected = $bindable(),
  }: {
    groups: NonNullable<PageData["groups"]>;
    selected: string[];
  } = $props();
  let search = $state("");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const filtered = $derived(
    groups.filter((group) => normalize(group.name).includes(normalize(search.trim()))),
  );
  const hasActiveGroup = $derived(
    groups.some((group) => group.active && selected.includes(group.id)),
  );
</script>

<p class="help">
  Sélectionnez les groupes de cet utilisateur. Il faut au moins un groupe actif et le droit de
  consulter les dossiers pour y accéder.
</p>
{#if groups.length}
  <label class="search-field">
    <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
    <input
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
      <label class="group-option" class:selected={selected.includes(group.id)}>
        <input
          type="checkbox"
          value={group.id}
          checked={selected.includes(group.id)}
          aria-label={group.name}
          onchange={(event) => {
            selected = event.currentTarget.checked
              ? [...selected, group.id]
              : selected.filter((id) => id !== group.id);
          }}
        />
        <span class="group-name">{group.name}</span>
        {#if !group.active}<span class="archived">Archivé</span>{/if}
      </label>
    {:else}<p class="empty">Aucun groupe ne correspond à la recherche.</p>{/each}
  </div>
  <p class="help" role="status">
    {selected.length} groupe{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1
      ? "s"
      : ""}.
    {#if !hasActiveGroup}<span class="warning"
        >Aucun groupe actif sélectionné : cet utilisateur n'aura pas accès aux dossiers.</span
      >{/if}
  </p>
  {#if groups.some((group) => !group.active)}<p class="help">
      Les groupes archivés conservent leurs membres, mais ne donnent pas accès aux dossiers.
    </p>{/if}
{:else}<p class="help">
    Aucun groupe disponible. Créez un groupe sur la page Groupes instructeurs.
  </p>{/if}

<style>
  .help {
    margin: 0.5rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--text-mention-grey);
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-default-grey);
    color: var(--text-mention-grey);
  }
  .search-field:focus-within {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: 2px;
  }
  input[type="search"] {
    width: 100%;
    min-width: 0;
    background: transparent;
    outline: none;
    font-size: 0.875rem;
    color: var(--text-default-grey);
  }
  .group-list {
    max-height: 14rem;
    overflow-y: auto;
    margin-top: 0.5rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
  }
  .group-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  .group-option + .group-option {
    border-top: 1px solid var(--border-default-grey);
  }
  .group-option:hover {
    background: var(--background-alt-grey-hover);
  }
  .group-option.selected {
    background: var(--background-action-low-blue-france);
  }
  input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    accent-color: var(--background-action-high-blue-france);
  }
  .group-name {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .archived {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--text-mention-grey);
  }
  .empty {
    margin: 0;
    padding: 1rem;
    font-size: 0.8125rem;
    color: var(--text-mention-grey);
  }
  .warning {
    display: block;
    color: var(--text-default-warning);
  }
</style>
