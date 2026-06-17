<script lang="ts">
  type Props = {
    value: boolean;
    label: string;
  };

  let { value = $bindable(false), label }: Props = $props();
</script>

<div class="toggle" role="radiogroup" aria-label={label}>
  <button
    type="button"
    class="toggle-option"
    class:active={value}
    role="radio"
    aria-checked={value}
    onclick={() => (value = true)}
  >
    Oui
  </button>
  <button
    type="button"
    class="toggle-option"
    class:active={!value}
    role="radio"
    aria-checked={!value}
    onclick={() => (value = false)}
  >
    Non
  </button>
</div>

<style lang="scss">
  .toggle {
    display: inline-grid;
    grid-template-columns: 1fr 1fr;
    width: max-content;
    border: 1px solid var(--border-action-high-blue-france);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .toggle-option {
    border: 0;
    background: var(--background-default-grey);
    cursor: pointer;
    padding: 0.25rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-action-high-blue-france);
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .toggle-option:hover {
    background: var(--background-action-low-blue-france-hover);
  }

  .toggle-option.active {
    background: var(--background-action-high-blue-france);
    color: var(--text-inverted-blue-france);
  }

  .toggle-option.active:hover {
    background: var(--background-action-high-blue-france-hover);
  }
</style>
