<script lang="ts">
  import { tick } from "svelte";
  import type { HeaderAction } from "$lib/pageHeader.svelte.ts";
  let { items }: { items: HeaderAction[] } = $props();
  const id = $props.id();
  let open = $state(false);
  let container: HTMLDivElement;
  let trigger: HTMLButtonElement;
  function close(restoreFocus = false) {
    open = false;
    if (restoreFocus) trigger.focus();
  }
  async function show(last = false) {
    open = true;
    await tick();
    const buttons = container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    buttons[last ? buttons.length - 1 : 0]?.focus();
  }
  function keydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
    if (!container.contains(event.target as Node)) return;
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next]?.focus();
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && !container.contains(event.target as Node)) close();
  }}
  onkeydown={keydown}
/>

<div
  class="download-menu"
  bind:this={container}
  onfocusout={(event) => {
    if (open && !container.contains(event.relatedTarget as Node)) close();
  }}
>
  <button
    bind:this={trigger}
    type="button"
    class="trigger"
    title="Télécharger"
    aria-label="Télécharger"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={id}
    onclick={() => (open ? close() : void show())}
    onkeydown={(event) => {
      if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        void show(event.key === "ArrowUp");
      }
    }}
  >
    <span class="fr-icon-download-line fr-icon--sm" aria-hidden="true"></span>
  </button>
  {#if open}
    <div {id} role="menu" aria-label="Téléchargements" class="menu">
      {#each items as item}
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          onclick={() => {
            close(true);
            item.onClick();
          }}>{item.label}</button
        >
      {/each}
    </div>
  {/if}
</div>

<style>
  .download-menu {
    position: relative;
    flex-shrink: 0;
  }
  .trigger {
    display: flex;
    padding: 0.375rem;
    border-radius: 0.375rem;
    color: var(--text-mention-grey);
  }
  .trigger:hover,
  .trigger[aria-expanded="true"] {
    background: var(--background-default-grey-hover);
    color: var(--text-title-grey);
  }
  .menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: 16rem;
    max-width: calc(100vw - 2rem);
    padding: 0.375rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.625rem;
    background: var(--background-lifted-grey);
    box-shadow: var(--lifted-shadow);
  }
  .menu button {
    display: block;
    box-sizing: border-box;
    width: 100%;
    text-align: left;
    padding: 0.625rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .menu button:hover,
  .menu button:focus-visible {
    background: var(--background-lifted-grey-hover);
  }
</style>
