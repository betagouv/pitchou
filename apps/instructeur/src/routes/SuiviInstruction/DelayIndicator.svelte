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

  const styleToBorderColor: Record<IndicatorStyle, string> = {
    info: "border-t-[color:var(--border-plain-info)]",
    success: "border-t-[color:var(--border-plain-success)]",
    warning: "border-t-[color:var(--border-plain-warning)]",
    error: "border-t-[color:var(--border-plain-error)]",
  };

  // Each segment: a 2px top border coloured by `style`, full width (1.5rem = w-6) or
  // half width (0.75rem = w-3) for the trailing fractional segment.
  const lineBase = "h-1/2 translate-y-1/2 border-0 border-t-2 border-solid mr-[0.2rem]";

  let lineClasses = $derived(
    [...Array(Math.ceil(adjustedQuantity))].map((_, i) =>
      clsx(lineBase, styleToBorderColor[style], adjustedQuantity - i >= 1 ? "w-6" : "w-3"),
    ),
  );
</script>

<div class="h-4 flex flex-row items-center justify-start" title={alt}>
  {#each lineClasses as classes}
    <span class={classes}></span>
  {/each}
</div>
