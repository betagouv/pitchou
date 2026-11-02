<script lang="ts">
  import type { Snippet } from "svelte";
  import { computePlacement, type Placement } from "./Select/placement.ts";

  let {
    id,
    label,
    trigger,
    onClose,
    children,
  }: {
    id: string;
    label: string;
    trigger: HTMLButtonElement;
    onClose: () => void;
    children: Snippet;
  } = $props();
  let panel = $state<HTMLDivElement>();
  let placement = $state<Placement>();

  $effect(() => {
    const update = () => {
      placement = computePlacement(
        trigger.getBoundingClientRect(),
        window.innerHeight,
        window.innerWidth,
        { preferredHeight: 384, minWidth: 256 },
      );
    };
    update();
    panel?.showPopover?.();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  });

  $effect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
      trigger.focus();
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  });
</script>

<div
  bind:this={panel}
  {id}
  role="group"
  aria-label={label}
  popover="manual"
  class="fixed inset-auto z-[2000] m-0 h-auto overflow-y-auto overscroll-contain [padding:0.5rem_1rem_0.75rem] bg-[var(--background-default-grey)] text-[var(--text-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
  style:left="{placement?.left ?? 0}px"
  style:width="{placement?.width ?? 0}px"
  style:max-height="{placement?.maxHeight ?? 0}px"
  style:top={placement?.top === undefined ? undefined : `${placement.top}px`}
  style:bottom={placement?.bottom === undefined ? undefined : `${placement.bottom}px`}
>
  {@render children()}
</div>
