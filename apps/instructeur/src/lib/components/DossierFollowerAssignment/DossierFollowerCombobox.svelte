<script lang="ts">
  import { removeAccents } from "@pitchou/common/stringManipulation.ts";
  import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";

  type Props = {
    id: string;
    candidates: DossierFollowerCandidate[];
    disabled?: boolean;
    describedBy?: string;
    onSelect: (candidate: DossierFollowerCandidate) => void;
  };

  let { id, candidates, disabled = false, describedBy, onSelect }: Props = $props();

  let root: HTMLElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let query = $state("");
  let open = $state(false);
  let activeIndex: number | null = $state(null);

  const listboxId = $derived(`${id}-listbox`);
  const filteredCandidates = $derived.by(() => {
    const searchParts = normalize(query).split(/\s+/).filter(Boolean);
    if (searchParts.length === 0) return candidates;

    return candidates.filter((candidate) => {
      const searchableText = normalize(
        [candidate.firstNames, candidate.lastName, candidate.email].filter(Boolean).join(" "),
      );
      return searchParts.every((part) => searchableText.includes(part));
    });
  });

  function normalize(value: string) {
    return removeAccents(value).toLocaleLowerCase("fr").trim();
  }

  function candidateName(candidate: DossierFollowerCandidate) {
    return [candidate.firstNames, candidate.lastName].filter(Boolean).join(" ");
  }

  function showCandidates() {
    if (disabled || candidates.length === 0) return;
    open = true;
    activeIndex = null;
  }

  function toggleCandidates() {
    if (disabled || candidates.length === 0) return;
    const shouldOpen = !open;
    input?.focus();
    open = shouldOpen;
    activeIndex = null;
  }

  function selectCandidate(candidate: DossierFollowerCandidate) {
    onSelect(candidate);
    query = "";
    open = false;
    activeIndex = null;
    input?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (disabled || candidates.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        open = true;
        if (filteredCandidates.length === 0) break;
        activeIndex =
          activeIndex === null || activeIndex === filteredCandidates.length - 1
            ? 0
            : activeIndex + 1;
        break;
      case "ArrowUp":
        event.preventDefault();
        open = true;
        if (filteredCandidates.length === 0) break;
        activeIndex =
          activeIndex === null || activeIndex === 0
            ? filteredCandidates.length - 1
            : activeIndex - 1;
        break;
      case "Enter":
        if (open && activeIndex !== null && filteredCandidates[activeIndex]) {
          event.preventDefault();
          selectCandidate(filteredCandidates[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          open = false;
          activeIndex = null;
        }
        break;
    }
  }

  function closeOnOutsideClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) {
      open = false;
      activeIndex = null;
    }
  }
</script>

<svelte:body onclick={closeOnOutsideClick} />

<div class="relative flex-none" bind:this={root}>
  <label class="fr-label fr-sr-only" for={id}>Ajouter une personne au suivi du dossier</label>
  <div class="relative">
    <input
      bind:this={input}
      bind:value={query}
      {id}
      type="text"
      role="combobox"
      class="fr-input pr-12"
      placeholder={candidates.length === 0
        ? "Toutes les personnes suivent déjà ce dossier"
        : "Rechercher un·e instructeur·ice…"}
      autocomplete="off"
      aria-autocomplete="list"
      aria-controls={listboxId}
      aria-expanded={open}
      aria-activedescendant={activeIndex === null ? undefined : `${id}-option-${activeIndex}`}
      aria-describedby={describedBy}
      {disabled}
      onfocus={showCandidates}
      onclick={showCandidates}
      oninput={() => {
        open = true;
        activeIndex = null;
      }}
      onkeydown={onKeyDown}
      onblur={(event) => {
        if (!root?.contains(event.relatedTarget as Node)) open = false;
      }}
    />
    <button
      type="button"
      class={`fr-btn fr-btn--tertiary-no-outline fr-btn--sm absolute right-2 top-1/2 -translate-y-1/2 ${open ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}`}
      aria-label={open ? "Fermer la liste des personnes" : "Afficher toutes les personnes"}
      tabindex="-1"
      {disabled}
      onmousedown={(event) => event.preventDefault()}
      onclick={toggleCandidates}
    ></button>
  </div>

  {#if open}
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Personnes pouvant suivre le dossier"
      class="absolute left-0 right-0 z-10 max-h-60 list-none overflow-y-auto border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))] fr-m-0 fr-p-0"
    >
      {#each filteredCandidates as candidate, index (candidate.email)}
        <li role="none">
          <button
            id={`${id}-option-${index}`}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            class="flex w-full flex-col items-start border-0 bg-[var(--background-default-grey)] text-left fr-py-1w fr-px-2w hover:bg-[var(--background-contrast-grey)] [&[aria-selected=true]]:bg-[var(--background-contrast-grey)]"
            onmouseenter={() => (activeIndex = index)}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => selectCandidate(candidate)}
          >
            {#if candidateName(candidate)}
              <span>{candidateName(candidate)}</span>
              <span class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
                {candidate.email}
              </span>
            {:else}
              <span>{candidate.email}</span>
            {/if}
          </button>
        </li>
      {:else}
        <li
          role="option"
          aria-disabled="true"
          aria-selected="false"
          class="text-[color:var(--text-mention-grey)] fr-py-1w fr-px-2w"
        >
          Aucune personne trouvée
        </li>
      {/each}
    </ul>
  {/if}
</div>
