<script lang="ts">
  type Props = {
    value: boolean;
    label: string;
  };

  let { value = $bindable(false), label }: Props = $props();
</script>

<div
  class="inline-grid grid-cols-2 w-max border border-[color:var(--border-action-high-blue-france)] rounded-[0.5rem] overflow-hidden"
  role="radiogroup"
  aria-label={label}
>
  <button
    type="button"
    class="border-0 bg-[var(--background-default-grey)] cursor-pointer fr-py-1v fr-px-5v text-[0.875rem] font-medium text-[color:var(--text-action-high-blue-france)] [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-[var(--background-action-low-blue-france-hover)] [&.active]:bg-[var(--background-action-high-blue-france)] [&.active]:text-[color:var(--text-inverted-blue-france)] [&.active]:hover:bg-[var(--background-action-high-blue-france-hover)]"
    class:active={value}
    role="radio"
    aria-checked={value}
    onclick={() => (value = true)}
  >
    Oui
  </button>
  <button
    type="button"
    class="border-0 bg-[var(--background-default-grey)] cursor-pointer fr-py-1v fr-px-5v text-[0.875rem] font-medium text-[color:var(--text-action-high-blue-france)] [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-[var(--background-action-low-blue-france-hover)] [&.active]:bg-[var(--background-action-high-blue-france)] [&.active]:text-[color:var(--text-inverted-blue-france)] [&.active]:hover:bg-[var(--background-action-high-blue-france-hover)]"
    class:active={!value}
    role="radio"
    aria-checked={!value}
    onclick={() => (value = false)}
  >
    Non
  </button>
</div>
