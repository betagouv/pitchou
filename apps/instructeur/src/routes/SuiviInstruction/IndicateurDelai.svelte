<script lang="ts">
  import { run } from "svelte/legacy";

  import clsx from "clsx";

  type IndicatorStyle = "info" | "success" | "warning" | "error";

  type Props = {
    style?: IndicatorStyle;
    quantity: number;
    alt: string;
  };

  let { style = "info", quantity, alt }: Props = $props();

  let adjustedQuantity = $derived(quantity);
  run(() => {
    if (adjustedQuantity < 0) {
      adjustedQuantity = 0;
    } else {
      if (adjustedQuantity > 5) {
        adjustedQuantity = 5;
      }
    }

    // round to the nearest half-value
    adjustedQuantity = Math.round(adjustedQuantity * 2) / 2;
  });

  let baseClasses = $derived(["line", style]);

  let lineClasses = $derived(
    [...Array(Math.ceil(adjustedQuantity))].map((_, i) => {
      if (adjustedQuantity - i >= 1) {
        return baseClasses;
      } else {
        return [...baseClasses, "half"];
      }
    }),
  );
</script>

<div class="delay" title={alt}>
  {#each lineClasses as classes}
    <span class={clsx(classes)}></span>
  {/each}
</div>

<style lang="scss">
  $line-width: 1.5rem;

  .delay {
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
      &.success {
        border-color: var(--border-plain-success);
      }
      &.warning {
        border-color: var(--border-plain-warning);
      }
      &.error {
        border-color: var(--border-plain-error);
      }
    }
  }
</style>
