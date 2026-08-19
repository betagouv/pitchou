<script lang="ts">
  import { tick } from "svelte";
  import AssignDossierFollowersModal from "./AssignDossierFollowersModal.svelte";
  import EditNextDueDateModal from "$lib/components/EditNextDueDateModal.svelte";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    dossierName: Dossier["name"];
    /** Context-specific entries appended after the shared ones. */
    extraItems?: { label: string; onClick: () => void }[];
  };

  let { dossierId, dossierName, extraItems = [] }: Props = $props();

  const menuId = $derived(`dossier-actions-menu-${dossierId}`);
  let menuOpen = $state(false);
  let modalOpen = $state(false);
  let dueDateModalOpen = $state(false);
  let rootElement: HTMLElement | undefined = $state();
  let triggerElement: HTMLButtonElement | undefined = $state();
  let menuItemElement: HTMLButtonElement | undefined = $state();

  async function openMenu() {
    menuOpen = true;
    await tick();
    menuItemElement?.focus();
  }

  function closeMenu(restoreFocus = false) {
    menuOpen = false;
    if (restoreFocus) void tick().then(() => triggerElement?.focus());
  }

  function openAssignmentModal() {
    menuOpen = false;
    modalOpen = true;
  }

  function closeAssignmentModal() {
    modalOpen = false;
    void tick().then(() => triggerElement?.focus());
  }

  function openDueDateModal() {
    menuOpen = false;
    dueDateModalOpen = true;
  }

  function closeDueDateModal() {
    dueDateModalOpen = false;
    void tick().then(() => triggerElement?.focus());
  }

  function onWindowClick(event: MouseEvent) {
    if (menuOpen && rootElement && !rootElement.contains(event.target as Node)) closeMenu();
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (!menuOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      menuItemElement?.focus();
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="relative" bind:this={rootElement}>
  <button
    bind:this={triggerElement}
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm min-w-8 justify-center px-2 text-[1.5rem] leading-none"
    aria-label={`Plus d’actions pour ${dossierName || `le dossier n°${dossierId}`}`}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-controls={menuId}
    onclick={() => (menuOpen ? closeMenu() : openMenu())}
    onkeydown={(event) => {
      if (!menuOpen && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        void openMenu();
      }
    }}
  >
    <span aria-hidden="true">&#8942;</span>
  </button>

  {#if menuOpen}
    <ul
      id={menuId}
      class="absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[14rem] list-none border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-m-0 fr-py-1v fr-px-0 shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      role="menu"
    >
      <li role="none">
        <button
          bind:this={menuItemElement}
          type="button"
          role="menuitem"
          class="block w-full cursor-pointer border-0 bg-none text-left fr-px-2w fr-py-1w hover:bg-[var(--background-contrast-grey)]"
          onclick={openAssignmentModal}
        >
          Faire suivre le dossier
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          class="block w-full cursor-pointer border-0 bg-none text-left fr-px-2w fr-py-1w hover:bg-[var(--background-contrast-grey)]"
          onclick={openDueDateModal}
        >
          Modifier la date de la prochaine échéance
        </button>
      </li>
      {#each extraItems as item}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="block w-full cursor-pointer border-0 bg-none text-left fr-px-2w fr-py-1w hover:bg-[var(--background-contrast-grey)]"
            onclick={() => {
              closeMenu();
              item.onClick();
            }}
          >
            {item.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if modalOpen}
  <AssignDossierFollowersModal {dossierId} {dossierName} onClose={closeAssignmentModal} />
{/if}

{#if dueDateModalOpen}
  <EditNextDueDateModal {dossierId} {dossierName} onClose={closeDueDateModal} />
{/if}
