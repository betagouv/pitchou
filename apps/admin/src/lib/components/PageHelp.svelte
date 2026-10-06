<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import Modal from "./Modal.svelte";

  let { title, children }: { title: string; children: Snippet } = $props();
  let open = $state(false);
  let content: HTMLDivElement | undefined = $state();
  let trigger: HTMLElement | null = null;
  async function show() {
    trigger = document.activeElement as HTMLElement | null;
    open = true;
    await tick();
    content?.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>("button")?.focus();
  }
  async function close() {
    open = false;
    await tick();
    trigger?.focus();
  }
  $effect(() => {
    pageHeader.setHelp({ label: `Aide : ${title}`, onClick: () => void show() });
    return () => pageHeader.clearHelp();
  });
  function keepFocus(event: KeyboardEvent) {
    if (!open || event.key !== "Tab") return;
    const controls = content
      ?.closest('[role="dialog"]')
      ?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
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

{#if open}
  <Modal size="large" {title} onClose={() => void close()}>
    <div class="help-content" bind:this={content}>{@render children()}</div>
    {#snippet footer()}
      <button type="button" class="close-help" onclick={() => void close()}>Fermer l'aide</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .help-content {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    line-height: 1.6;
  }
  .help-content :global(h3) {
    margin: 1.25rem 0 0.5rem;
    font-size: 1rem;
  }
  .help-content > :global(:first-child) {
    margin-top: 0;
  }
  .help-content :global(p) {
    margin: 0 0 0.75rem;
  }
  .help-content :global(ul) {
    margin: 0;
    padding-left: 1.25rem;
  }
  .help-content :global(li + li) {
    margin-top: 0.5rem;
  }
  .close-help {
    margin-left: auto;
    padding: 0.625rem 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }
</style>
