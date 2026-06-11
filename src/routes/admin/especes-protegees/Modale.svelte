<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    onClose: () => void;
    /** "large" widens the dialog (e.g. for the species selector). */
    size?: "default" | "large";
    /** Optional content before the title (e.g. a back button). */
    headerStart?: Snippet;
    /** Pinned footer; omit to hide the footer bar entirely. */
    footer?: Snippet;
    children: Snippet;
  };

  let { title, onClose, size = "default", headerStart, footer, children }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="overlay"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <div
    class="dialog"
    class:large={size === "large"}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <header class="dialog-header">
      {@render headerStart?.()}
      <h2 class="dialog-title">{title}</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer"
        aria-label="Fermer"
        onclick={onClose}
      ></button>
    </header>

    <div class="dialog-content">
      {@render children()}
    </div>

    {#if footer}
      <footer class="dialog-footer">
        {@render footer()}
      </footer>
    {/if}
  </div>
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 1rem;
    overflow-y: auto;
  }

  .dialog {
    background: var(--background-default-grey);
    border-radius: 0.5rem;
    width: 100%;
    max-width: 42rem;
    // Never taller than the viewport (minus the overlay padding): the content scrolls,
    // the header and footer stay pinned.
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    transition: max-width 0.15s ease;

    &.large {
      max-width: 48rem;
    }
  }

  .dialog-header {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default-grey);
  }

  .dialog-title {
    margin: 0;
    margin-right: auto;
    font-size: 1.25rem;
  }

  // Padding-free on purpose: each consumer pads its own content (the selector brings its own).
  .dialog-content {
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .dialog-footer {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default-grey);
  }
</style>
