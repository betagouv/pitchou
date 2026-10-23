<script lang="ts">
  import type { GroupMemberCandidate } from "@pitchou/types/groupMembership.ts";

  let {
    id,
    groupId,
    value = $bindable(""),
    disabled = false,
    describedBy,
  }: {
    id: string;
    groupId: string;
    value?: string;
    disabled?: boolean;
    describedBy?: string;
  } = $props();
  let root: HTMLDivElement;
  let input: HTMLInputElement;
  let open = $state(false);
  let candidates = $state<GroupMemberCandidate[]>([]);
  let activeIndex = $state<number | null>(null);
  let loading = $state(false);
  let failure = $state("");

  $effect(() => {
    const query = value;
    if (!open || disabled) return;
    const controller = new AbortController();
    candidates = [];
    activeIndex = null;
    loading = true;
    failure = "";
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/parametres/groupes/${encodeURIComponent(groupId)}/membres?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const results: GroupMemberCandidate[] = await response.json();
        if (!controller.signal.aborted) candidates = results;
      } catch {
        if (!controller.signal.aborted)
          failure = "La recherche est indisponible. Vous pouvez saisir une adresse e-mail.";
      } finally {
        if (!controller.signal.aborted) loading = false;
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });

  $effect(() => {
    if (open && activeIndex !== null)
      document
        .querySelector(`#${CSS.escape(`${id}-option-${activeIndex}`)}`)
        ?.scrollIntoView({ block: "nearest" });
  });

  function select(candidate: GroupMemberCandidate) {
    value = candidate.email;
    input.focus();
    open = false;
    activeIndex = null;
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open = true;
      if (candidates.length > 0)
        activeIndex =
          activeIndex === null
            ? event.key === "ArrowDown"
              ? 0
              : candidates.length - 1
            : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + candidates.length) %
              candidates.length;
    } else if (event.key === "Enter" && open && activeIndex !== null && candidates[activeIndex]) {
      event.preventDefault();
      select(candidates[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      open = false;
      activeIndex = null;
    }
  }
</script>

<div class="relative min-w-0 flex-1" bind:this={root}>
  <input
    bind:this={input}
    bind:value
    {id}
    type="text"
    role="combobox"
    class="fr-input pr-12"
    placeholder="Rechercher par nom ou e-mail, ou saisir une nouvelle adresse…"
    required
    maxlength="254"
    pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
    title="Sélectionnez une personne ou saisissez une adresse e-mail complète."
    autocomplete="off"
    spellcheck="false"
    data-form-type="other"
    data-1p-ignore
    data-lpignore="true"
    aria-autocomplete="list"
    aria-controls={`${id}-listbox`}
    aria-expanded={open && !disabled}
    aria-activedescendant={open && activeIndex !== null ? `${id}-option-${activeIndex}` : undefined}
    aria-describedby={describedBy}
    {disabled}
    onfocus={() => (open = true)}
    onclick={() => (open = true)}
    oninput={() => {
      open = true;
      activeIndex = null;
    }}
    onkeydown={keydown}
    onblur={(event) => {
      if (!root.contains(event.relatedTarget as Node)) open = false;
    }}
  />
  <button
    type="button"
    class={`fr-btn fr-btn--tertiary-no-outline fr-btn--sm absolute right-2 top-1/2 -translate-y-1/2 ${open ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}`}
    aria-label={open ? "Fermer les suggestions" : "Afficher les suggestions"}
    tabindex="-1"
    {disabled}
    onmousedown={(event) => event.preventDefault()}
    onclick={() => {
      const show = !open;
      input.focus();
      open = show;
    }}
  ></button>
  {#if open && !disabled}
    <div
      class="absolute left-0 right-0 z-10 max-h-60 overflow-y-auto border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-lg"
    >
      <ul
        id={`${id}-listbox`}
        role="listbox"
        aria-label="Utilisateurs à ajouter"
        aria-busy={loading}
        class="list-none m-0! p-0!"
      >
        {#each candidates as candidate, index (candidate.id)}
          <li role="none">
            <button
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              class="flex w-full flex-col items-start border-0 text-left px-4 py-2 [overflow-wrap:anywhere] hover:bg-[var(--background-contrast-grey)] [&[aria-selected=true]]:bg-[var(--background-contrast-grey)]"
              onmouseenter={() => (activeIndex = index)}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => select(candidate)}
            >
              {#if candidate.first_names || candidate.last_name}
                <span>{[candidate.first_names, candidate.last_name].filter(Boolean).join(" ")}</span
                >
                <span class="text-sm text-[var(--text-mention-grey)]">{candidate.email}</span>
              {:else}<span>{candidate.email}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
      <p class="m-0! px-4 py-2 text-sm text-[var(--text-mention-grey)]" role="status">
        {#if loading}Recherche…
        {:else if failure}{failure}
        {:else if candidates.length === 0}Aucun utilisateur trouvé. Vous pouvez saisir une nouvelle
          adresse e-mail.
        {:else if candidates.length === 20}Les 20 premiers résultats sont affichés. Précisez votre
          recherche.
        {:else}Sélectionnez une personne ou saisissez une nouvelle adresse e-mail.{/if}
      </p>
    </div>
  {/if}
</div>
