<script lang="ts">
  type Props = {
    searchText: string;
    /** Recent searches offered as clickable suggestions, most recent first */
    suggestions: string[];
    onSearch: (text: string) => void;
  };

  let { searchText, suggestions, onSearch }: Props = $props();

  let suggestionsOpen = $state(false);
  let searchRoot: HTMLElement | undefined = $state();

  // Hide the suggestion identical to what is already typed
  const visibleSuggestions = $derived(
    suggestions.filter((suggestion) => suggestion !== searchText.trim()),
  );

  function onBodyClick(event: MouseEvent) {
    if (suggestionsOpen && searchRoot && !searchRoot.contains(event.target as Node)) {
      suggestionsOpen = false;
    }
  }

  function selectSuggestion(suggestion: string) {
    suggestionsOpen = false;
    onSearch(suggestion);
  }
</script>

<svelte:body onclick={onBodyClick} />

<div
  class="relative min-w-[20rem] flex-[0_1_32rem] ml-auto max-[768px]:[min-width:unset] max-[768px]:basis-full max-[768px]:ml-0"
  bind:this={searchRoot}
>
  <form
    class="fr-search-bar"
    role="search"
    onsubmit={(e) => {
      e.preventDefault();
      suggestionsOpen = false;
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
      onfocus={() => (suggestionsOpen = true)}
      oninput={(e) => onSearch(e.currentTarget.value)}
    />
    <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher un dossier</button
    >
  </form>

  {#if suggestionsOpen && visibleSuggestions.length > 0}
    <ul
      class="absolute z-10 top-[calc(100%+0.25rem)] left-0 right-0 fr-m-0 fr-py-1v fr-px-0 list-none bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      role="listbox"
      aria-label="Recherches récentes"
    >
      <li
        class="fr-pt-1w fr-px-2w fr-pb-1v text-[color:var(--text-mention-grey)] text-[0.75rem] uppercase"
        role="presentation"
      >
        Recherches récentes
      </li>
      {#each visibleSuggestions as suggestion (suggestion)}
        <li role="none">
          <button
            type="button"
            role="option"
            aria-selected="false"
            class="block w-full text-left fr-py-1w fr-px-2w bg-none border-0 cursor-pointer hover:bg-[var(--background-contrast-grey)] fr-icon-time-line fr-btn--icon-left"
            onclick={() => selectSuggestion(suggestion)}
          >
            {suggestion}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
