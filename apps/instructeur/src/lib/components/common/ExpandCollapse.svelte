<script lang="ts">
  // Component used for a purpose somewhat similar to the DSFR accordion...
  // https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/accordeon
  //
  // ...but when that one is too heavy and we prefer a details/summary that is visually lighter
  // and standard

  import type { Snippet } from "svelte";

  type Props = {
    open?: boolean;
    summary?: Snippet;
    content?: Snippet;
  };

  let { open = false, summary, content }: Props = $props();
</script>

<details {open} class="group [cursor:initial]">
  <summary
    class="flex flex-row items-baseline cursor-pointer marker:content-[''] after:ml-[0.5em] after:[padding:0.2em_0.4em] after:content-['Déplier_→'] after:[white-space:pre] after:text-[0.8rem] after:text-[color:var(--border-action-high-blue-france)] after:border after:border-[color:var(--border-action-high-blue-france)] group-open:after:content-['Replier_↓']"
  >
    {@render summary?.()}
  </summary>
  {@render content?.()}
</details>
