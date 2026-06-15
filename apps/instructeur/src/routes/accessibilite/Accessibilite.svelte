<script lang="ts">
  import Squelette from "$lib/components/Squelette.svelte";
  import Loader from "$lib/components/Loader.svelte";

  let { title = "Accessibilité", html = "" }: { title?: string; html?: string } = $props();
</script>

<Squelette nav={false} {title}>
  <div class="fr-container fr-my-6w">
    {#if html === ""}
      <Loader></Loader>
    {:else}
      <div class="fr-content" aria-labelledby="titre-declaration">
        {@html html}
      </div>
    {/if}
  </div>
</Squelette>
