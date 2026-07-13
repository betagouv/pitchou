<script lang="ts">
  import type { DossiersQuery, FilterChip, SortKey, SortOrder } from "./dossiersList.ts";
  import { serviceLabel } from "./dossiersList.ts";
  import DossiersSortMenu from "./DossiersSortMenu.svelte";

  type Props = {
    titre: string;
    searchText: string;
    afficherFiltreInstructeurice: boolean;
    sansInstructeuriceActif: boolean;
    enjeuActif: boolean;
    activeFilterCount: number;
    nombreFiltrés: number;
    /** Names of the instructeur's services (groupes instructeurs) */
    services: string[];
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
    services,
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
</script>

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
        oninput={(e) => onSearch(e.currentTarget.value)}
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

    <DossiersSortMenu {sortKey} {sortOrder} {onSort} />
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
    <span class="fr-text--lg">{serviceLabel(services)}</span>
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

  .toolbar__chips {
    margin: 0;
  }

  .compteur {
    margin: 0;
  }
</style>
