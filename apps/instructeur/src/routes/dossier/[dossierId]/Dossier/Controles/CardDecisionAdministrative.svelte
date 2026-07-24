<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<!--
  Card used to present a décision administrative (existing, being edited, or
  being created) so they are easy to tell apart. Single source of truth for the
  card style.
-->
<section
  class="fr-mb-4w fr-py-3w fr-px-4w fr-background-default--grey rounded-[0.5rem] border border-[color:var(--border-default-grey)] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
>
  {@render children()}
</section>
