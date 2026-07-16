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

  let baseClasses = $derived(["line", style]);

  let lineClasses = $derived(
    [...Array(Math.ceil(quantiteAjustee))].map((_, i) => {
      if (quantiteAjustee - i >= 1) {
        return baseClasses;
      } else {
        return [...baseClasses, "half"];
      }
    }),
  );
</script>

<div class="delai" title={alt}>
  {#each lineClasses as classes}
    <span class={clsx(classes)}></span>
  {/each}
</div>

<style lang="scss">
  $line-width: 1.5rem;

  .delai {
    height: 1rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;

    .line {
      width: $line-width;
      height: 50%;
      transform: translateY(50%);

      border: none;
      border-top: 2px solid var(--border-default-grey);
      margin-right: 0.2rem;

      &.half {
        width: calc($line-width/2);
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
