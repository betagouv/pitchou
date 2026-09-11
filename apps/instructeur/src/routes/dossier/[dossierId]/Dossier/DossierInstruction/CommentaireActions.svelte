<script lang="ts">
  import { tick } from "svelte";

  let {
    commentaireId,
    onEdit,
    onDelete,
  }: {
    commentaireId: string;
    onEdit?: () => void;
    onDelete?: () => Promise<void>;
  } = $props();

  let menuOpen = $state(false);
  let confirmationOpen = $state(false);
  let deleting = $state(false);
  let errorMessage = $state("");
  let root: HTMLDivElement;
  let trigger: HTMLButtonElement;
  const menuId = $derived(`commentaire-actions-${commentaireId}`);
  const titleId = $derived(`commentaire-suppression-${commentaireId}`);

  async function openMenu() {
    menuOpen = true;
    await tick();
    root.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }

  function closeMenu(restoreFocus = false) {
    menuOpen = false;
    if (restoreFocus) trigger.focus();
  }

  function onKeydown(event: KeyboardEvent) {
    if (!menuOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = [...root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  function showConfirmation(dialog: HTMLDialogElement) {
    dialog.showModal();
  }

  async function closeConfirmation() {
    confirmationOpen = false;
    await tick();
    trigger?.focus();
  }

  async function confirmDelete() {
    if (!onDelete || deleting) return;
    deleting = true;
    errorMessage = "";
    try {
      await onDelete();
      confirmationOpen = false;
    } catch {
      errorMessage = "Le commentaire n'a pas pu être supprimé.";
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:window
  onclick={(event) => {
    if (menuOpen && !root.contains(event.target as Node)) closeMenu();
  }}
  onkeydown={onKeydown}
/>

<div class="relative flex shrink-0" bind:this={root}>
  <button
    bind:this={trigger}
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm min-w-8 items-center justify-center"
    aria-label="Actions du commentaire"
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-controls={menuId}
    onclick={() => (menuOpen ? closeMenu() : openMenu())}
    onkeydown={(event) => {
      if (!menuOpen && event.key === "ArrowDown") {
        event.preventDefault();
        void openMenu();
      }
    }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="block shrink-0"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  </button>
  {#if menuOpen}
    <ul
      id={menuId}
      role="menu"
      aria-label="Actions du commentaire"
      class="absolute right-0 top-full z-20 w-48 list-none border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-m-0 fr-p-1v shadow-md"
    >
      {#if onEdit}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-pencil-line w-full"
            onclick={() => {
              closeMenu();
              onEdit?.();
            }}>Modifier</button
          >
        </li>
      {/if}
      {#if onDelete}
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-delete-line w-full"
            onclick={() => {
              closeMenu();
              confirmationOpen = true;
            }}>Supprimer</button
          >
        </li>
      {/if}
    </ul>
  {/if}
</div>

{#if confirmationOpen}
  <dialog
    use:showConfirmation
    role="alertdialog"
    aria-labelledby={titleId}
    aria-describedby={`${titleId}-description`}
    class="m-auto max-w-[32rem] fr-py-3w fr-px-4w rounded-[0.5rem] border-0 bg-[var(--background-default-grey)] text-[color:var(--text-default-grey)] backdrop:bg-black/40"
    oncancel={(event) => {
      if (deleting) event.preventDefault();
    }}
    onclose={closeConfirmation}
  >
    <h5 id={titleId} class="fr-mt-0">Supprimer ce commentaire ?</h5>
    <p id={`${titleId}-description`}>
      Cette action est irréversible. La suppression restera visible dans l'historique du dossier.
    </p>
    {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
    <div class="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        class="fr-btn fr-btn--secondary"
        disabled={deleting}
        onclick={closeConfirmation}>Annuler</button
      >
      <button type="button" class="fr-btn" disabled={deleting} onclick={confirmDelete}>
        {deleting ? "Suppression en cours…" : "Confirmer la suppression"}
      </button>
    </div>
  </dialog>
{/if}
