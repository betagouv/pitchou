<script lang="ts">
  import type { Snippet } from "svelte";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";

  let {
    title,
    label,
    children,
    footer,
    overlay,
    modalOpen = false,
  }: {
    title: string;
    label: string;
    children: Snippet;
    footer: Snippet;
    overlay?: Snippet;
    modalOpen?: boolean;
  } = $props();
  $effect(() => {
    pageHeader.setTitle(title);
    return () => pageHeader.clearTitle();
  });
</script>

<svelte:head><title>{title} · Administration Pitchou</title></svelte:head>

<section class="editor-page" aria-label={label}>
  <div class="editor-content" inert={modalOpen}>{@render children()}</div>
  <footer hidden={modalOpen}>{@render footer()}</footer>
  {@render overlay?.()}
</section>

<style>
  .editor-page {
    width: 100%;
    max-width: 72rem;
    min-width: 0;
    margin: 0 auto;
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  .editor-content {
    flex: 1;
    min-width: 0;
  }
  footer {
    position: sticky;
    bottom: 0;
    z-index: 10;
    padding: 1rem;
    background: var(--background-default-grey);
    border-top: 1px solid var(--border-default-grey);
    box-shadow: 0 -0.25rem 1rem var(--background-default-grey);
  }
</style>
