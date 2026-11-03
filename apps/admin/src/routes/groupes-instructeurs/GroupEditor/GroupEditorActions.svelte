<script lang="ts">
  let {
    saving,
    message,
    rulesValid,
    formId,
    previewCurrent,
    previewOpen,
    validName,
    onClose,
    showPreview,
  }: {
    saving: boolean;
    message: string;
    rulesValid: boolean;
    formId: string;
    previewCurrent: boolean;
    previewOpen: boolean;
    validName: boolean;
    onClose: () => void;
    showPreview: () => void;
  } = $props();
</script>

<div class="w-full">
  {#if !rulesValid}<p class="fr-text--sm fr-mb-2w" role="status">
      Complétez les critères de chaque règle avant de vérifier les affectations.
    </p>{/if}
  {#if message}<p class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      {message}
    </p>{/if}
  <div class="flex w-full flex-wrap items-center justify-end gap-2">
    <button class="fr-btn fr-btn--secondary" type="button" disabled={saving} onclick={onClose}>
      {previewOpen ? "Revenir à l'édition" : "Annuler"}
    </button>
    {#if previewOpen}
      <button class="fr-btn" type="submit" form={formId} disabled={saving || !previewCurrent}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    {:else}
      <button
        class="fr-btn"
        type="button"
        disabled={saving || !validName || !rulesValid}
        onclick={showPreview}
      >
        {saving ? "Vérification…" : "Vérifier les affectations"}
      </button>
    {/if}
  </div>
</div>
