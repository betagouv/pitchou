<script lang="ts">
  import type { DossiersQuery, FilterChip, SortKey, SortOrder } from "./dossiersList.ts";

  type Props = {
    titre: string;
    searchText: string;
    afficherFiltreInstructeurice: boolean;
    sansInstructeuriceActif: boolean;
    enjeuActif: boolean;
    activeFilterCount: number;
    nombreFiltrés: number;
    /** Active filters shown as removable tags */
    chips: FilterChip[];
    sortKey: SortKey;
    sortOrder: SortOrder;
    onSearch: (text: string) => void;
    onToggleSansInstructeurice: () => void;
    onToggleEnjeu: () => void;
    onOpenFiltres: () => void;
    onRemoveFiltre: (next: DossiersQuery) => void;
    onSort: (key: SortKey, order: SortOrder) => void;
  };

  let {
    titre,
    searchText,
    afficherFiltreInstructeurice,
    sansInstructeuriceActif,
    enjeuActif,
    activeFilterCount,
    nombreFiltrés,
    chips,
    sortKey,
    sortOrder,
    onSearch,
    onToggleSansInstructeurice,
    onToggleEnjeu,
    onOpenFiltres,
    onRemoveFiltre,
    onSort,
  }: Props = $props();

  const TRI_OPTIONS: { key: SortKey; order: SortOrder; label: string }[] = [
    { key: "depositDate", order: "desc", label: "Date de dépôt : les plus récentes" },
    { key: "depositDate", order: "asc", label: "Date de dépôt : les plus anciennes" },
    {
      key: "lastModified",
      order: "desc",
      label: "Date de dernière modification : les plus récentes",
    },
    {
      key: "lastModified",
      order: "asc",
      label: "Date de dernière modification : les plus anciennes",
    },
    { key: "name", order: "asc", label: "Nom du dossier : ordre alphabétique" },
    { key: "name", order: "desc", label: "Nom du dossier : ordre anti-alphabétique" },
  ];

  const triLabel = $derived(
    TRI_OPTIONS.find((option) => option.key === sortKey && option.order === sortOrder)?.label ??
      TRI_OPTIONS[0].label,
  );

  let triOuvert = $state(false);
  let triRoot: HTMLElement | undefined = $state();

  function onBodyClick(event: MouseEvent) {
    if (triOuvert && triRoot && !triRoot.contains(event.target as Node)) triOuvert = false;
  }

  function choisirTri(key: SortKey, order: SortOrder) {
    triOuvert = false;
    onSort(key, order);
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="toolbar">
  <div class="toolbar__entete">
    <h1>{titre}</h1>

    <form
      class="fr-search-bar barre-de-recherche"
      role="search"
      onsubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onSearch(String(data.get("texte-de-recherche") ?? ""));
      }}
    >
      <label class="fr-label" for="recherche-dossier">Rechercher un dossier</label>
      <input
        value={searchText}
        class="fr-input"
        id="recherche-dossier"
        name="texte-de-recherche"
        placeholder="Rechercher"
        type="search"
      />
      <button title="Rechercher un dossier" type="submit" class="fr-btn"
        >Rechercher un dossier</button
      >
    </form>
  </div>

  <div class="toolbar__actions">
    {#if afficherFiltreInstructeurice}
      <button
        type="button"
        class="fr-btn fr-btn--secondary"
        aria-pressed={sansInstructeuriceActif}
        class:actif={sansInstructeuriceActif}
        onclick={onToggleSansInstructeurice}
      >
        Dossiers sans instructeur·ice
      </button>
    {/if}

    <button
      type="button"
      class="fr-btn fr-btn--secondary"
      aria-pressed={enjeuActif}
      class:actif={enjeuActif}
      onclick={onToggleEnjeu}
    >
      Dossiers à enjeux
    </button>

    <button
      type="button"
      class="fr-btn fr-icon-filter-line fr-btn--icon-left"
      onclick={onOpenFiltres}
    >
      Filtres{#if activeFilterCount > 0}&nbsp;<span class="compteur-filtres"
          >{activeFilterCount}</span
        >{/if}
    </button>

    <div class="tri" bind:this={triRoot}>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary"
        aria-haspopup="true"
        aria-expanded={triOuvert}
        onclick={() => (triOuvert = !triOuvert)}
      >
        Tri : {triLabel}
      </button>
      {#if triOuvert}
        <ul class="tri__menu" role="menu">
          {#each TRI_OPTIONS as option (option.key + option.order)}
            <li role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option.key === sortKey && option.order === sortOrder}
                class="tri__option"
                class:actif={option.key === sortKey && option.order === sortOrder}
                onclick={() => choisirTri(option.key, option.order)}
              >
                {option.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  {#if chips.length > 0}
    <ul class="fr-tags-group fr-tags-group--sm toolbar__chips" data-testid="filtres-actifs">
      {#each chips as chip (chip.key)}
        <li>
          <button
            type="button"
            class="fr-tag fr-tag--dismiss"
            aria-label="Retirer le filtre {chip.label}"
            onclick={() => onRemoveFiltre(chip.next)}
          >
            {chip.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="compteur" data-testid="compteur-dossier">
    <span class="fr-text--lead">{nombreFiltrés}</span>
    <span class="fr-text--lg">dossiers dans votre service</span>
  </p>
</div>

<style lang="scss">
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  // Title on the left, search bar pushed to the right on the same row.
  .toolbar__entete {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    h1 {
      margin: 0;
    }
  }

  .toolbar__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }

  .barre-de-recherche {
    min-width: 20rem;
    flex: 0 1 32rem;
    margin-left: auto;

    @media (max-width: 768px) {
      min-width: unset;
      flex-basis: 100%;
      margin-left: 0;
    }
  }

  // Pressed quick-filter buttons read as active.
  .fr-btn.actif {
    box-shadow: inset 0 0 0 2px var(--border-active-blue-france, #000091);
  }

  .compteur-filtres {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.25rem;
    border-radius: 0.75rem;
    background: var(--background-default-grey);
    color: var(--text-action-high-blue-france, #000091);
    font-size: 0.75rem;
    line-height: 1;
  }

  .tri {
    position: relative;
  }

  .tri__menu {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 16rem;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    box-shadow: var(--overlap-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));
  }

  .tri__option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    background: none;
    border: 0;
    cursor: pointer;

    &:hover {
      background: var(--background-contrast-grey);
    }

    &.actif {
      font-weight: 700;
    }
  }

  .toolbar__chips {
    margin: 0;
  }

  .compteur {
    margin: 0;
  }
</style>
