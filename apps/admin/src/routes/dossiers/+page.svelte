<script lang="ts">
  import ListDossiers from "./ListDossiers.svelte";
  import UnmatchedDossiers from "./UnmatchedDossiers.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Administration - dossiers — Pitchou</title>
</svelte:head>

<div class="flex flex-col gap-4">
  {#if data.unmatched.length}
    <UnmatchedDossiers dossiers={data.unmatched} />
  {/if}
  <ListDossiers />
</div>
