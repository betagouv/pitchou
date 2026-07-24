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

<div
  class="field flex flex-col gap-2 border-t border-t-[color:var(--border-default-grey)] fr-pt-3v [&_.field-value]:[word-break:break-word] [&_.hint]:text-[color:var(--text-mention-grey)] [&_.hint]:italic [&_.hint]:m-0"
>
  <div class="flex flex-row justify-between items-center gap-4 min-h-8">
    <span class="fr-text--bold">{label}</span>
    <div class="flex flex-row gap-1">
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
    <div class="flex flex-col gap-2 [&_.inherit]:mb-1">{@render edit()}</div>
  {:else}
    {@render display()}
  {/if}
</div>
