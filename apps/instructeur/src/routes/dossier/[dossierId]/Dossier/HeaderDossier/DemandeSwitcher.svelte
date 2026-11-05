<script lang="ts">
  import { tick } from "svelte";
  import type { DossierDemande } from "@pitchou/types/dossierDemandes.ts";

  let {
    demandes,
    dossierId,
    onSelect,
  }: {
    demandes: DossierDemande[];
    dossierId: number;
    onSelect: (id: number) => void;
  } = $props();
  const current = $derived(demandes.find((demande) => demande.id === dossierId));
  let open = $state(false);
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let menu: HTMLDivElement | undefined = $state();

  async function openMenu() {
    open = true;
    await tick();
    menu?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }

  function closeMenu(restoreFocus = false) {
    open = false;
    if (restoreFocus) trigger.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!open || event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = Array.from(
        menu?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [],
      );
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && !root.contains(event.target as Node)) closeMenu();
  }}
  onkeydown={onKeydown}
/>

<div class="relative w-fit max-w-full" bind:this={root}>
  <button
    id="active-demande"
    bind:this={trigger}
    type="button"
    class="demande-trigger flex max-w-full items-center gap-2 rounded px-2 py-1 text-left"
    aria-label={`Changer de demande : ${current?.label ?? "Demande du dossier"}`}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls="demande-switcher-menu"
    onclick={() => (open ? closeMenu() : openMenu())}
    onkeydown={(event) => {
      if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        void openMenu();
      }
    }}
  >
    <span class="fr-icon-file-text-line fr-icon--sm shrink-0" aria-hidden="true"></span>
    <span class="min-w-0 break-words">{current?.label ?? "Demande du dossier"}</span>
    <span
      class="fr-icon-arrow-down-s-line fr-icon--sm shrink-0"
      class:rotate-180={open}
      aria-hidden="true"
    ></span>
  </button>
  {#if open}
    <div
      id="demande-switcher-menu"
      bind:this={menu}
      role="menu"
      aria-label="Demandes du dossier"
      class="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-80 w-[28rem] max-w-[calc(100vw-4rem)] overflow-y-auto rounded border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-1 shadow-lg"
    >
      {#each demandes as demande (demande.id)}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={demande.id === dossierId}
          tabindex={demande.id === dossierId ? 0 : -1}
          class="demande-option flex w-full items-center gap-3 rounded p-3 text-left"
          onclick={() => {
            closeMenu(true);
            if (demande.id !== dossierId) onSelect(demande.id);
          }}
        >
          <span class="min-w-0 flex-1">
            <span class="block break-words">{demande.label}</span>
            <span class="block text-sm text-[var(--text-mention-grey)]">{demande.phase}</span>
          </span>
          {#if demande.id === dossierId}
            <span class="fr-icon-check-line fr-icon--sm shrink-0" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .demande-trigger {
    color: var(--text-action-high-blue-france);
    background: var(--background-contrast-grey);
  }
  .demande-trigger:hover,
  .demande-option:hover {
    background: var(--background-contrast-grey-hover);
  }
  .demande-option[aria-checked="true"] {
    color: var(--text-action-high-blue-france);
    background: var(--background-contrast-blue-france);
  }
</style>
