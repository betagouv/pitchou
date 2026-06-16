<script lang="ts">
  import Loader from "$lib/components/Loader.svelte";

  let { title = "Accessibilité", html = "" }: { title?: string; html?: string } = $props();
</script>

<svelte:head>
  <title>{title} — Pitchou</title>
</svelte:head>

<div class="fr-container fr-my-6w">
  {#if html === ""}
    <Loader></Loader>
  {:else}
    <div class="fr-content" aria-labelledby="titre-declaration">
      {@html html}
    </div>
  {/if}
</div>
