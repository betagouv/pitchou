<script lang="ts">
  import { onMount } from "svelte";
  import { removeAccents } from "@pitchou/common/stringManipulation.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import CnpnCcRecipients from "./CnpnCcRecipients.svelte";
  import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  type Option =
    { kind: "candidate"; candidate: DossierFollowerCandidate } | { kind: "email"; email: string };

  let {
    dossierId,
    selectedEmails = $bindable(),
  }: {
    dossierId: Dossier["id"];
    selectedEmails: string[];
  } = $props();
  let root: HTMLElement | undefined = $state();
  let input: HTMLInputElement | undefined = $state();
  let candidates: DossierFollowerCandidate[] = $state([]);
  let query = $state("");
  let open = $state(false);
  let activeIndex: number | null = $state(null);
  let loading = $state(true);
  let loadFailed = $state(false);
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedUsedEmails = $derived(
    new Set(selectedEmails.map((email) => email.toLowerCase())),
  );
  const options = $derived.by<Option[]>(() => {
    const searchParts = normalize(query).split(/\s+/).filter(Boolean);
    const matchingCandidates = candidates.filter((candidate) => {
      if (normalizedUsedEmails.has(candidate.email.toLowerCase())) return false;
      const searchable = normalize(
        [candidate.firstNames, candidate.lastName, candidate.email].filter(Boolean).join(" "),
      );
      return searchParts.every((part) => searchable.includes(part));
    });
    const trimmedEmail = query.trim().toLowerCase();
    const canAddEmail =
      EMAIL_PATTERN.test(trimmedEmail) &&
      !normalizedUsedEmails.has(trimmedEmail) &&
      !candidates.some((candidate) => candidate.email.toLowerCase() === trimmedEmail);
    return [
      ...matchingCandidates.map((candidate) => ({ kind: "candidate" as const, candidate })),
      ...(canAddEmail ? [{ kind: "email" as const, email: trimmedEmail }] : []),
    ];
  });
  const listboxId = $derived(`cnpn-cc-${dossierId}-listbox`);
  onMount(async () => {
    try {
      candidates = (await store.capabilities.listDossierFollowerCandidates?.(dossierId)) ?? [];
    } catch {
      loadFailed = true;
    } finally {
      loading = false;
    }
  });

  function normalize(value: string) {
    return removeAccents(value).toLocaleLowerCase("fr").trim();
  }

  function candidateName(candidate: DossierFollowerCandidate) {
    return [candidate.firstNames, candidate.lastName].filter(Boolean).join(" ");
  }

  function select(option: Option) {
    const email = option.kind === "candidate" ? option.candidate.email : option.email;
    selectedEmails = [...selectedEmails, email];
    query = "";
    open = false;
    activeIndex = null;
    input?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      open = false;
      activeIndex = null;
      return;
    }
    if (event.key === "Enter" && options.length > 0) {
      const option =
        activeIndex === null
          ? (options.find(({ kind }) => kind === "email") ??
            (options.length === 1 ? options[0] : null))
          : options[activeIndex];
      if (!option) return;
      event.preventDefault();
      select(option);
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key) || options.length === 0) return;
    event.preventDefault();
    open = true;
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const currentIndex = activeIndex ?? (direction === 1 ? -1 : 0);
    activeIndex = (currentIndex + direction + options.length) % options.length;
  }

  function remove(email: string) {
    selectedEmails = selectedEmails.filter((selected) => selected !== email);
  }
  function closeOnOutsideClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:body onclick={closeOnOutsideClick} />

<div class="fr-mb-3w">
  <label class="fr-label" for={`cnpn-cc-${dossierId}`}>
    En copie
    <span class="fr-hint-text">Recherchez un·e instructeur·ice ou saisissez une adresse email.</span
    >
  </label>
  <div class="relative flex-none" bind:this={root}>
    <div class="relative">
      <input
        bind:this={input}
        bind:value={query}
        id={`cnpn-cc-${dossierId}`}
        class="fr-input pr-12"
        type="text"
        role="combobox"
        autocomplete="off"
        placeholder="Nom ou adresse email"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeIndex === null ? undefined : `${listboxId}-${activeIndex}`}
        onfocus={() => (open = true)}
        onclick={() => (open = true)}
        oninput={() => {
          open = true;
          activeIndex = null;
        }}
        onkeydown={onKeyDown}
      />
      <span
        class="fr-icon-search-line absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--text-action-high-blue-france)]"
        aria-hidden="true"
      ></span>
    </div>
    {#if open}
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Personnes à ajouter en copie"
        class="absolute left-0 right-0 z-10 max-h-60 list-none overflow-y-auto border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))] fr-m-0 fr-p-0"
      >
        {#each options as option, index}
          <li role="none">
            <button
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              class="flex w-full flex-col items-start border-0 bg-[var(--background-default-grey)] text-left fr-py-1w fr-px-2w hover:bg-[var(--background-contrast-grey)] [&[aria-selected=true]]:bg-[var(--background-contrast-grey)]"
              onmouseenter={() => (activeIndex = index)}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => select(option)}
            >
              {#if option.kind === "candidate"}
                <span>{candidateName(option.candidate) || option.candidate.email}</span>
                {#if candidateName(option.candidate)}
                  <span class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
                    {option.candidate.email}
                  </span>
                {/if}
              {:else}
                <span>Ajouter l'adresse {option.email}</span>
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
            {loading
              ? "Chargement des instructeur·ices…"
              : query
                ? "Aucun instructeur trouvé. Saisissez une adresse email valide."
                : "Saisissez un nom ou une adresse email."}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {#if loadFailed}
    <p class="fr-hint-text fr-mt-1w">
      La recherche est indisponible, mais vous pouvez ajouter une adresse email.
    </p>
  {/if}
  <CnpnCcRecipients emails={selectedEmails} onRemove={remove} />
</div>
