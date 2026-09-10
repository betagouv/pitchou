<script lang="ts">
  import { tick } from "svelte";
  import shareForwardIcon from "@gouvfr/dsfr/dist/icons/system/share-forward-fill.svg?no-inline";
  import AssignDossierFollowersModal from "./AssignDossierFollowersModal.svelte";
  import EditNextDueDateModal from "$lib/components/EditNextDueDateModal.svelte";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    dossierName: Dossier["name"];
    showDeadline?: boolean;
    outlined?: boolean;
    /** Context-specific entries appended after the shared ones. */
    extraItems?: { label: string; icon?: string; onClick: () => void }[];
  };

  let {
    dossierId,
    dossierName,
    showDeadline = true,
    outlined = false,
    extraItems = [],
  }: Props = $props();

  const menuId = $derived(`dossier-actions-menu-${dossierId}`);
  let menuOpen = $state(false);
  let modalOpen = $state(false);
  let dueDateModalOpen = $state(false);
  let rootElement: HTMLElement | undefined = $state();
  let triggerElement: HTMLButtonElement | undefined = $state();
  let menuElement: HTMLUListElement | undefined = $state();
  const items = $derived([
    {
      label: "Faire suivre le dossier",
      icon: "fr-icon-share-forward-fill",
      onClick: () => (modalOpen = true),
    },
    ...(showDeadline
      ? [
          {
            label: "Modifier la date de la prochaine échéance",
            icon: "fr-icon-calendar-event-line",
            onClick: () => (dueDateModalOpen = true),
          },
        ]
      : []),
    ...extraItems,
  ]);

  async function openMenu() {
    menuOpen = true;
    await tick();
    menuElement?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }

  function closeMenu(restoreFocus = false) {
    menuOpen = false;
    if (restoreFocus) void tick().then(() => triggerElement?.focus());
  }

  function closeAssignmentModal() {
    modalOpen = false;
    void tick().then(() => triggerElement?.focus());
  }

  function closeDueDateModal() {
    dueDateModalOpen = false;
    void tick().then(() => triggerElement?.focus());
  }

  function onWindowClick(event: MouseEvent) {
    if (menuOpen && rootElement && !rootElement.contains(event.target as Node)) closeMenu();
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (!menuOpen || event.defaultPrevented) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(
        menuElement?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [],
      );
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="relative flex" bind:this={rootElement}>
  <button
    bind:this={triggerElement}
    type="button"
    class="fr-btn fr-btn--sm dossier-actions-trigger"
    class:fr-btn--secondary={outlined}
    class:fr-btn--tertiary-no-outline={!outlined}
    class:outlined
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  </button>

  {#if menuOpen}
    <ul
      bind:this={menuElement}
      id={menuId}
      class="absolute right-0 top-[calc(100%+0.25rem)] z-20 w-[22rem] max-w-[calc(100vw-2rem)] list-none border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-m-0 fr-py-1v fr-px-0 shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      role="menu"
    >
      {#each items as item}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 cursor-pointer border-0 bg-none text-left fr-px-2w fr-py-1w hover:bg-[var(--background-contrast-grey)]"
            onclick={() => {
              closeMenu();
              item.onClick();
            }}
          >
            {#if item.icon}
              <span
                class="{item.icon} shrink-0 text-[color:var(--text-action-high-blue-france)]"
                style:--share-forward-icon={`url('${shareForwardIcon}')`}
                aria-hidden="true"
              ></span>
            {/if}
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

{#if showDeadline && dueDateModalOpen}
  <EditNextDueDateModal {dossierId} {dossierName} onClose={closeDueDateModal} />
{/if}

<style>
  .fr-icon-share-forward-fill::before {
    -webkit-mask-image: var(--share-forward-icon);
    mask-image: var(--share-forward-icon);
  }

  .dossier-actions-trigger {
    justify-content: center;
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    padding: 0;
  }

  .dossier-actions-trigger svg {
    flex: none;
  }

  .dossier-actions-trigger.outlined {
    --border-action-high-blue-france: var(--blue-france-main-525, #6a6af4);
    --hover: transparent;
    --active: transparent;
    width: 40px;
    height: 40px;
    border-radius: 4px;
  }

  .dossier-actions-trigger.outlined:hover {
    --border-action-high-blue-france: #000091;
  }
</style>
