<script lang="ts">
  import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
  let {
    name,
    label = "Niveau d'accès",
    value = $bindable<AccessLevel>("read"),
    disabled = false,
  }: { name: string; label?: string; value: AccessLevel; disabled?: boolean } = $props();
  const options = [
    {
      value: "read",
      label: "Lecture complète",
      description: "Consulter toutes les informations, sans les modifier.",
      icon: "fr-icon-eye-line",
    },
    {
      value: "instruct",
      label: "Instruction",
      description: "Consulter et modifier le dossier.",
      icon: "fr-icon-edit-line",
    },
  ] as const;
</script>

<fieldset class="access-level-choice" {disabled}>
  <legend>{label}</legend>
  <div class="level-options">
    {#each options as option}
      <label class:chosen={value === option.value}>
        <input type="radio" {name} value={option.value} bind:group={value} />
        <span>
          <strong><span class={option.icon} aria-hidden="true"></span>{option.label}</strong>
          <small>{option.description}</small>
        </span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .access-level-choice {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .level-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.625rem;
    background: var(--background-default-grey);
    cursor: pointer;
  }
  label.chosen {
    border-color: var(--border-action-high-blue-france);
    background: var(--background-contrast-blue-france);
  }
  input {
    margin: 0.25rem 0 0;
    flex: none;
    width: 1rem;
    height: 1rem;
    accent-color: var(--background-action-high-blue-france);
  }
  strong {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  small {
    display: block;
    color: var(--text-mention-grey);
    margin-top: 0.25rem;
    line-height: 1.5;
  }
  fieldset:disabled label {
    cursor: default;
    opacity: 0.65;
  }
  @media (max-width: 575px) {
    .level-options {
      grid-template-columns: 1fr;
    }
  }
</style>
