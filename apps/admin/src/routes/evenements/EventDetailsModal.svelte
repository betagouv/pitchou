<script lang="ts">
  import { onMount } from "svelte";
  import Modal from "$lib/components/Modal.svelte";
  import type { EvenementMetriqueRow } from "$lib/actions/adminEvenements.ts";

  let {
    evenement,
    date,
    onClose,
  }: {
    evenement: EvenementMetriqueRow;
    date: string;
    onClose: () => void;
  } = $props();
  let content: HTMLDivElement;
  const details = $derived(
    evenement.details == null
      ? null
      : typeof evenement.details === "object"
        ? JSON.stringify(evenement.details, null, 2)
        : String(evenement.details),
  );

  onMount(() => {
    content.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>("button")?.focus();
  });

  function keepFocus(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const buttons = content
      .closest('[role="dialog"]')
      ?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={keepFocus} />

<Modal title="Détails de l'évènement" size="large" {onClose}>
  <div class="event-details" bind:this={content}>
    <dl>
      <div>
        <dt>Évènement</dt>
        <dd>{evenement.evenement}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{date}</dd>
      </div>
      <div class="full-width">
        <dt>Utilisateur</dt>
        <dd>{evenement.email ?? "Utilisateur inconnu"}</dd>
      </div>
      <div class="full-width">
        <dt>Identifiant</dt>
        <dd class="identifier">{evenement.id}</dd>
      </div>
    </dl>
    <h3>Détails enregistrés</h3>
    {#if details !== null && details !== ""}
      <pre>{details}</pre>
    {:else}
      <p class="empty-details">Aucun détail supplémentaire pour cet évènement.</p>
    {/if}
  </div>
  {#snippet footer()}
    <button type="button" class="close-button" onclick={onClose}>Fermer</button>
  {/snippet}
</Modal>

<style>
  .event-details {
    padding: 1.25rem 1.5rem;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem 1.5rem;
    margin: 0 0 1.5rem;
  }
  dt {
    margin-bottom: 0.25rem;
    color: var(--text-mention-grey);
    font-size: 0.75rem;
  }
  dd {
    margin: 0;
    font-size: 0.875rem;
    overflow-wrap: anywhere;
  }
  .full-width {
    grid-column: 1 / -1;
  }
  .identifier {
    font-family: monospace;
    color: var(--text-mention-grey);
  }
  h3 {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
  }
  pre {
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-default-grey);
    color: var(--text-default-grey);
    font-size: 0.8125rem;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .empty-details {
    margin: 0;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  .close-button {
    margin-left: auto;
    padding: 0.625rem 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }
  @media (max-width: 575px) {
    dl {
      grid-template-columns: minmax(0, 1fr);
    }
    .event-details {
      padding: 1rem;
    }
  }
</style>
