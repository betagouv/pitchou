<script lang="ts">
  // Visual marker of an option: an image in a colored circle, or a plain color swatch.
  type Props = { color?: string; icon?: string };

  let { color, icon }: Props = $props();
</script>

<!-- Both variants are as tall as one line of text (1.5rem), so they stay centered
     on the first line even in rows aligned to the top (e.g. options with a hint). -->
{#if icon}
  <span
    class="flex h-6 w-6 flex-none items-center justify-center rounded-full"
    style:background-color={color}
  >
    <img src={icon} alt="" class="h-4 w-4" />
  </span>
{:else if color}
  <span class="flex h-6 flex-none items-center" aria-hidden="true">
    <span class="h-3 w-3 rounded-full" style:background-color={color}></span>
  </span>
{/if}
