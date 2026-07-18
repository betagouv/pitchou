<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<!--
  Card used to present a décision administrative (existing, being edited, or
  being created) so they are easy to tell apart. Single source of truth for the
  card style.
-->
<section class="card-decision-administrative">
  {@render children()}
</section>

<style lang="scss">
  .card-decision-administrative {
    margin-bottom: 2rem;
    padding: 1.5rem 2rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background-color: var(--background-default-grey);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }
</style>
