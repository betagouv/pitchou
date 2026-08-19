<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    /** DOM id of the collapsible region, must be unique in the page. */
    id: string;
    title: string;
    /** Badges rendered in the accordion band, next to the title. */
    badges?: Snippet;
    children: Snippet;
  };

  let { id, title, badges, children }: Props = $props();

  // Expansion is managed here rather than by dsfr.module.js: the DSFR script does
  // not wire collapses rendered dynamically by Svelte (same reason the dossier
  // tabs are hand-managed).
  let expanded = $state(false);
</script>

<section
  class="overflow-hidden rounded-[0.5rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)]"
>
  <h3 class="fr-m-0">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-[1.125rem] font-bold text-[color:var(--text-title-grey)] hover:bg-[var(--background-default-grey-hover)]"
      aria-expanded={expanded}
      aria-controls={id}
      onclick={() => (expanded = !expanded)}
    >
      <span class="flex flex-wrap items-center gap-3">
        {title}
        {#if badges}{@render badges()}{/if}
      </span>
      <span
        class="fr-icon-arrow-down-s-line shrink-0 transition-transform duration-200 {expanded
          ? 'rotate-180'
          : ''}"
        aria-hidden="true"
      ></span>
    </button>
  </h3>
  {#if expanded}
    <div {id} class="px-6 pb-6 pt-2">
      {@render children()}
    </div>
  {/if}
</section>
