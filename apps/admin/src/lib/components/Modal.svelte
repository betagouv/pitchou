<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    onClose: () => void;
    /** Widens the dialog: "large" for forms, "xlarge" for the species/taxon list selectors. */
    size?: "default" | "large" | "xlarge";
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
  class="fixed inset-0 z-[1000] bg-[rgba(0,0,0,0.4)] flex items-start justify-center fr-py-4w fr-px-2w overflow-y-auto"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <!-- Never taller than the viewport (minus the overlay padding): the content scrolls,
       the header and footer stay pinned. -->
  <div
    class="bg-[var(--background-default-grey)] rounded-[0.5rem] w-full max-h-[calc(100vh-4rem)] flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.3)] [transition:max-width_0.15s_ease] {size ===
    'large'
      ? 'max-w-[48rem]'
      : size === 'xlarge'
        ? 'max-w-[72rem]'
        : 'max-w-[42rem]'}"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <header
      class="flex-[0_0_auto] flex flex-row items-center gap-4 fr-py-2w fr-px-3w border-b border-[color:var(--border-default-grey)]"
    >
      {@render headerStart?.()}
      <h2 class="my-0 ml-0 mr-auto text-[1.25rem]">{title}</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer"
        aria-label="Fermer"
        onclick={onClose}
      ></button>
    </header>

    <!-- Padding-free on purpose: each consumer pads its own content (the selector brings its own). -->
    <div class="flex-[1_1_auto] overflow-y-auto">
      {@render children()}
    </div>

    {#if footer}
      <footer
        class="flex-[0_0_auto] flex flex-row items-center gap-2 flex-wrap fr-py-2w fr-px-3w border-t border-[color:var(--border-default-grey)]"
      >
        {@render footer()}
      </footer>
    {/if}
  </div>
</div>
