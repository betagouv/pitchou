<script lang="ts">
  import { onDestroy } from "svelte";

  import type { Commune } from "./dossierAdminFormModel.ts";

  type ApiCommune = {
    nom: string;
    code: string;
    codesPostaux: string[];
    codeDepartement?: string;
  };
  type Props = {
    id?: string;
    label?: string;
    value: Commune[];
    disabled?: boolean;
    onChange: (value: Commune[]) => void;
  };

  let {
    id = "edit-commune-search",
    label = "Communes",
    value,
    disabled = false,
    onChange,
  }: Props = $props();
  let query = $state("");
  let results = $state<ApiCommune[]>([]);
  let loading = $state(false);
  let searchError = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function queueSearch() {
    clearTimeout(timer);
    controller?.abort();
    results = [];
    searchError = null;
    const search = query.trim();
    if (search.length < 2) {
      results = [];
      loading = false;
      return;
    }
    timer = setTimeout(() => searchCommunes(search), 300);
  }

  async function searchCommunes(search: string) {
    const currentController = new AbortController();
    controller = currentController;
    loading = true;
    try {
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(search)}&fields=nom,code,codesPostaux,codeDepartement&limit=10`,
        { signal: currentController.signal },
      );
      if (!response.ok) throw new Error("Recherche indisponible");
      const body: unknown = await response.json();
      results = Array.isArray(body) ? (body as ApiCommune[]) : [];
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        searchError = "La recherche de communes a échoué.";
        results = [];
      }
    } finally {
      if (controller === currentController) loading = false;
    }
  }

  function selectCommune(result: ApiCommune) {
    clearTimeout(timer);
    controller?.abort();
    loading = false;
    const commune: Commune = {
      name: result.nom,
      code: result.code,
      postalCode: result.codesPostaux[0] ?? "",
      departmentCode: result.codeDepartement,
    };
    const duplicate = value.some(
      (item) => item.code === commune.code && item.postalCode === commune.postalCode,
    );
    if (!duplicate) onChange([...value, commune]);
    query = "";
    results = [];
  }

  onDestroy(() => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

<div class="fr-input-group w-full">
  <label class="fr-label" for={id}>
    {label}
    <span class="fr-hint-text" id={`${id}-hint`}>
      Saisissez au moins deux caractères puis choisissez une commune.
    </span>
  </label>
  <div class="relative">
    <input
      class="fr-input w-full"
      {id}
      type="search"
      autocomplete="off"
      data-form-type="other"
      {disabled}
      bind:value={query}
      oninput={queueSearch}
      aria-describedby={`${id}-hint`}
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const search = query.trim();
          if (search.length >= 2) {
            clearTimeout(timer);
            controller?.abort();
            results = [];
            searchCommunes(search);
          }
        }
      }}
    />
    {#if loading}<p class="fr-hint-text fr-mt-1v" role="status" aria-live="polite">
        Recherche…
      </p>{/if}
    {#if searchError}<p class="fr-error-text" role="alert">{searchError}</p>{/if}
    {#if results.length > 0}
      <ul
        id={`${id}-results`}
        aria-label="Suggestions de communes"
        class="absolute z-10 left-0 right-0 max-h-64 overflow-y-auto list-none m-0 p-0 bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] shadow-md"
      >
        {#each results as result (`${result.code}-${result.codesPostaux.join("-")}`)}
          <li>
            <button
              type="button"
              class="w-full text-left fr-p-2w border-0 bg-transparent cursor-pointer hover:bg-[var(--background-alt-grey-hover)]"
              onclick={() => selectCommune(result)}
            >
              {result.nom} ({result.codesPostaux.join(", ") || result.code})
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

{#if value.length > 0}
  <ul class="fr-tags-group fr-tags-group--sm fr-mt-2w" aria-label="Communes sélectionnées">
    {#each value as commune, index (`${commune.code ?? commune.name}-${commune.postalCode ?? index}`)}
      <li>
        <button
          type="button"
          class="fr-tag fr-tag--dismiss"
          aria-label={`Retirer ${commune.name}`}
          {disabled}
          onclick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
          >{commune.name}{commune.postalCode ? ` (${commune.postalCode})` : ""}</button
        >
      </li>
    {/each}
  </ul>
{/if}
