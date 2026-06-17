<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    label: string;
    editing: boolean;
    saving?: boolean;
    /** Shows a « + » in the header while editing (list fields). */
    canAdd?: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onAdd?: () => void;
    display: Snippet;
    edit: Snippet;
  };

  let {
    label,
    editing,
    saving = false,
    canAdd = false,
    onEdit,
    onSave,
    onCancel,
    onAdd,
    display,
    edit,
  }: Props = $props();
</script>

<div class="field">
  <div class="field-head">
    <span class="field-label">{label}</span>
    <div class="field-head-actions">
      {#if editing}
        {#if canAdd}
          <button
            type="button"
            class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-add-line"
            title="Ajouter un nom"
            aria-label="Ajouter un nom"
            disabled={saving}
            onclick={onAdd}
          ></button>
        {/if}
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-check-line"
          title="Enregistrer"
          aria-label="Enregistrer"
          disabled={saving}
          onclick={onSave}
        ></button>
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-close-line"
          title="Annuler"
          aria-label="Annuler"
          disabled={saving}
          onclick={onCancel}
        ></button>
      {:else}
        <button
          type="button"
          class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-edit-line"
          title="Modifier ce champ"
          aria-label="Modifier ce champ"
          onclick={onEdit}
        ></button>
      {/if}
    </div>
  </div>

  {#if editing}
    <div class="field-edit">{@render edit()}</div>
  {:else}
    {@render display()}
  {/if}
</div>

<style lang="scss">
  .field {
    border-top: 1px solid var(--border-default-grey);
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-head {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    min-height: 2rem;
  }

  .field-head-actions {
    display: flex;
    flex-direction: row;
    gap: 0.25rem;
  }

  .field-label {
    font-weight: 700;
  }

  .field-edit {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  // The display/edit content is provided by the concrete field components (via snippets),
  // so these shared bits are matched with :global within this field's subtree.
  .field :global(.field-value) {
    word-break: break-word;
  }

  .field :global(.hint) {
    color: var(--text-mention-grey);
    font-style: italic;
    margin: 0;
  }

  .field-edit :global(.inherit) {
    margin-bottom: 0.25rem;
  }
</style>
