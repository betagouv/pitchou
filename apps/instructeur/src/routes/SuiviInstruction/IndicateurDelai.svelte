<script lang="ts">
  import { run } from "svelte/legacy";

  import clsx from "clsx";

  type StyleIndicateur = "info" | "succès" | "avertissement" | "erreur";

  type Props = {
    style?: StyleIndicateur;
    quantité: number;
    alt: string;
  };

  let { style = "info", quantité: quantite, alt }: Props = $props();

  let quantiteAjustee = $derived(quantite);
  run(() => {
    if (quantiteAjustee < 0) {
      quantiteAjustee = 0;
    } else {
      if (quantiteAjustee > 5) {
        quantiteAjustee = 5;
      }
    }

    // round to the nearest half-value
    quantiteAjustee = Math.round(quantiteAjustee * 2) / 2;
  });

  let baseClasses = $derived(["trait", style]);

  let traitsClasses = $derived(
    [...Array(Math.ceil(quantiteAjustee))].map((_, i) => {
      if (quantiteAjustee - i >= 1) {
        return baseClasses;
      } else {
        return [...baseClasses, "moitié"];
      }
    }),
  );
</script>

<div class="délai" title={alt}>
  {#each traitsClasses as classes}
    <span class={clsx(classes)}></span>
  {/each}
</div>

<style lang="scss">
  $largeur-trait: 1.5rem;

  .délai {
    height: 1rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;

    .trait {
      width: $largeur-trait;
      height: 50%;
      transform: translateY(50%);

      border: none;
      border-top: 2px solid var(--border-default-grey);
      margin-right: 0.2rem;

      &.moitié {
        width: calc($largeur-trait/2);
      }

      &.info {
        border-color: var(--border-plain-info);
      }
      &.succès {
        border-color: var(--border-plain-success);
      }
      &.avertissement {
        border-color: var(--border-plain-warning);
      }
      &.erreur {
        border-color: var(--border-plain-error);
      }
    }
  }
</style>
