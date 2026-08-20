<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    variant?: "info" | "warning";
    children: Snippet;
  };

  let { title, variant = "info", children }: Props = $props();

  let open = $state(false);
  const bodyId = $props.id();

  const VARIANTS = {
    info: {
      section: "border-[color:var(--background-contrast-info-active)]",
      header: "bg-[var(--background-contrast-info)]",
      icon: "fr-icon-info-line",
      body: "bg-[color-mix(in_srgb,var(--background-contrast-info)_30%,var(--background-default-grey))]",
    },
    warning: {
      section: "border-[color:var(--background-contrast-warning-active)]",
      header: "bg-[var(--background-contrast-warning)]",
      icon: "fr-icon-warning-line",
      body: "bg-[color-mix(in_srgb,var(--background-contrast-warning)_30%,var(--background-default-grey))]",
    },
  } as const;

  const styles = $derived(VARIANTS[variant]);
</script>

<section class="overflow-hidden rounded-xl border border-solid {styles.section}">
  <h2 class="!m-0">
    <button
      type="button"
      class="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-lg font-bold {styles.header}"
      aria-expanded={open}
      aria-controls={bodyId}
      onclick={() => (open = !open)}
    >
      <span class="{styles.icon} shrink-0" aria-hidden="true"></span>
      <span class="grow">{title}</span>
      <span
        class="fr-icon--sm shrink-0"
        class:fr-icon-arrow-up-s-line={open}
        class:fr-icon-arrow-down-s-line={!open}
        aria-hidden="true"
      ></span>
    </button>
  </h2>
  {#if open}
    <div id={bodyId} class="p-4 {styles.body}">
      {@render children()}
    </div>
  {/if}
</section>
