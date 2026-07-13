<script lang="ts">
  type Props = {
    searchText: string;
    /** Recent searches offered as clickable suggestions, most recent first */
    suggestions: string[];
    onSearch: (text: string) => void;
  };

  let { searchText, suggestions, onSearch }: Props = $props();

  let suggestionsOuvertes = $state(false);
  let rechercheRoot: HTMLElement | undefined = $state();

  // Hide the suggestion identical to what is already typed
  const suggestionsVisibles = $derived(
    suggestions.filter((suggestion) => suggestion !== searchText.trim()),
  );

  function onBodyClick(event: MouseEvent) {
    if (suggestionsOuvertes && rechercheRoot && !rechercheRoot.contains(event.target as Node)) {
      suggestionsOuvertes = false;
    }
  }

  function choisirSuggestion(suggestion: string) {
    suggestionsOuvertes = false;
    onSearch(suggestion);
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="barre-de-recherche" bind:this={rechercheRoot}>
  <form
    class="fr-search-bar"
    role="search"
    onsubmit={(e) => {
      e.preventDefault();
      suggestionsOuvertes = false;
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
      onfocus={() => (suggestionsOuvertes = true)}
      oninput={(e) => onSearch(e.currentTarget.value)}
    />
    <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher un dossier</button
    >
  </form>

  {#if suggestionsOuvertes && suggestionsVisibles.length > 0}
    <ul class="suggestions" role="listbox" aria-label="Recherches récentes">
      <li class="suggestions__titre" role="presentation">Recherches récentes</li>
      {#each suggestionsVisibles as suggestion (suggestion)}
        <li role="none">
          <button
            type="button"
            role="option"
            aria-selected="false"
            class="suggestions__option fr-icon-time-line fr-btn--icon-left"
            onclick={() => choisirSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .barre-de-recherche {
    position: relative;
    min-width: 20rem;
    flex: 0 1 32rem;
    margin-left: auto;

    @media (max-width: 768px) {
      min-width: unset;
      flex-basis: 100%;
      margin-left: 0;
    }
  }

  .suggestions {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    box-shadow: var(--overlap-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));
  }

  .suggestions__titre {
    padding: 0.5rem 1rem 0.25rem;
    color: var(--text-mention-grey);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .suggestions__option {
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
  }
</style>
