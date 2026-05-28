<script lang="ts">
  // Composant utilisé pour un usage un peu similaire à l'accordéon du DSFR...
  // https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/accordeon
  //
  // ...mais quand celui-ci est trop balourd et qu'on préfère un details/summary pus léger visuellement
  // et standard

  import type { Snippet } from "svelte";

  type Props = {
    open?: boolean;
    summary?: Snippet;
    content?: Snippet;
  };

  let { open = false, summary, content }: Props = $props();
</script>

<details {open}>
  <summary>
    {@render summary?.()}
  </summary>
  {@render content?.()}
</details>

<style lang="scss">
  details {
    cursor: initial;

    summary {
      display: flex;
      flex-direction: row;
      align-items: baseline;

      cursor: pointer;

      &::marker {
        content: "";
      }

      &::after {
        padding: 0.2em 0.4em;
        margin-left: 0.5em;

        content: "Déplier →";
        white-space: pre;
        font-size: 0.8rem;
        color: var(--border-action-high-blue-france);
        border: 1px solid var(--border-action-high-blue-france);
      }
    }

    &[open] {
      summary::after {
        content: "Replier ↓";
      }
    }
  }
</style>
