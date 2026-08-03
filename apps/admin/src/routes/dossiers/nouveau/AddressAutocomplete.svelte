<script lang="ts">
  import { onDestroy } from "svelte";

  type AddressFeature = {
    properties?: { label?: string; city?: string; postcode?: string; name?: string };
  };
  type Props = {
    id: string;
    label: string;
    hint: string;
    placeholder?: string;
    value: string;
    kind?: "address" | "municipality";
    onChange: (value: string) => void;
  };

  let {
    id,
    label,
    hint,
    placeholder = "Commencez à saisir",
    value,
    kind = "address",
    onChange,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let query = $state(value);
  let results: AddressFeature[] = $state([]);
  let activeIndex = $state(0);
  let loading = $state(false);
  let searchError = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function featureLabel(feature: AddressFeature): string {
    const properties = feature.properties;
    if (kind === "municipality") {
      return [properties?.city ?? properties?.name, properties?.postcode].filter(Boolean).join(" ");
    }
    return properties?.label ?? "";
  }

  function queueSearch() {
    onChange(query);
    clearTimeout(timer);
    controller?.abort();
    results = [];
    searchError = false;
    activeIndex = 0;
    if (query.trim().length < 3) {
      results = [];
      loading = false;
      return;
    }
    timer = setTimeout(() => search(query.trim()), 250);
  }

  async function search(searchQuery: string) {
    const currentController = new AbortController();
    controller = currentController;
    loading = true;
    const type = kind === "municipality" ? "&type=municipality" : "";
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=8${type}`,
        { signal: currentController.signal },
      );
      if (!response.ok) throw new Error("Address search failed");
      const body = (await response.json()) as { features?: AddressFeature[] };
      results = (body.features ?? []).filter((feature) => featureLabel(feature));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        results = [];
        searchError = true;
      }
    } finally {
      if (controller === currentController) loading = false;
    }
  }

  function selectFeature(feature: AddressFeature) {
    clearTimeout(timer);
    controller?.abort();
    loading = false;
    query = featureLabel(feature);
    onChange(query);
    results = [];
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      selectFeature(results[activeIndex]);
    } else if (event.key === "Escape") {
      results = [];
    }
  }

  onDestroy(() => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

<div class="fr-input-group w-full">
  <label class="fr-label" for={id}>
    {label} <span class="fr-hint-text" id={`${id}-hint`}>{hint}</span>
  </label>
  <div class="relative">
    <input
      class="fr-input w-full pr-12"
      class:italic={!query}
      {id}
      type="search"
      autocomplete="off"
      {placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={results.length > 0}
      aria-controls={`${id}-results`}
      aria-describedby={`${id}-hint`}
      aria-activedescendant={results[activeIndex] ? `${id}-result-${activeIndex}` : undefined}
      bind:value={query}
      oninput={queueSearch}
      onkeydown={onKeydown}
      onblur={() => (results = [])}
    />
    <span
      class="fr-icon-search-line absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--text-mention-grey)]"
      aria-hidden="true"
    ></span>
    {#if results.length > 0}
      <ul
        class="absolute z-20 left-0 right-0 list-none m-0 p-0 max-h-64 overflow-y-auto bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] shadow-md"
        id={`${id}-results`}
        role="listbox"
      >
        {#each results as result, index (`${featureLabel(result)}-${index}`)}
          <li
            class={`fr-px-3w fr-py-2w cursor-pointer ${index === activeIndex ? "bg-[var(--background-alt-grey-active)]" : "hover:bg-[var(--background-alt-grey-hover)]"}`}
            id={`${id}-result-${index}`}
            role="option"
            tabindex="-1"
            aria-selected={index === activeIndex}
            onmouseenter={() => (activeIndex = index)}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => selectFeature(result)}
            onkeydown={(event) => event.key === "Enter" && selectFeature(result)}
          >
            {featureLabel(result)}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {#if loading}<p class="fr-hint-text fr-mt-1v" role="status" aria-live="polite">Recherche…</p>{/if}
  {#if searchError}<p class="fr-error-text" role="alert">
      La recherche d'adresse est indisponible.
    </p>{/if}
</div>
