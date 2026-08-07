<script lang="ts">
  type Props = {
    templates: File[];
    dragging: boolean;
    error?: string;
    fileInput?: HTMLInputElement;
    templateKey: (file: File) => string;
    onInput: (event: Event) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onRemove: (file: File) => void;
  };
  let {
    templates,
    dragging = $bindable(),
    error,
    fileInput = $bindable(),
    templateKey,
    onInput,
    onDragOver,
    onDrop,
    onRemove,
  }: Props = $props();
</script>

<div class="fr-upload-group fr-mb-4w">
  <p class="fr-label fr-mt-4w">Ajouter un ou plusieurs modèles de documents</p>
  <p class="fr-hint-text fr-mb-2w">Format accepté : ODT. Plusieurs fichiers possibles.</p>
  <div
    role="group"
    aria-label="Ajout de modèles de documents"
    class="border-2 border-dashed border-[color:var(--border-default-grey)] bg-[var(--background-contrast-grey)] p-8 text-center {dragging
      ? 'border-[color:var(--border-action-high-blue-france)]'
      : ''}"
    ondragover={onDragOver}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    <span class="fr-icon-upload-2-line fr-icon--lg" aria-hidden="true"></span>
    <p class="fr-mb-1w fr-mt-1w">Glissez-déposez vos modèles ici</p>
    <p class="fr-mb-1w">ou</p>
    <button class="fr-btn fr-btn--secondary" type="button" onclick={() => fileInput?.click()}
      >Choisir des fichiers</button
    >
  </div>
  <input
    bind:this={fileInput}
    class="fr-sr-only"
    type="file"
    accept=".odt"
    id="file-upload"
    multiple
    onchange={onInput}
  />
  {#if error}<p class="fr-error-text fr-mt-1w">{error}</p>{/if}
  {#if templates.length > 0}
    <div class="fr-mt-3w" aria-live="polite">
      <p class="font-bold fr-mb-1w">
        {templates.length}
        {templates.length === 1 ? "modèle sélectionné" : "modèles sélectionnés"}
      </p>
      <ul class="m-0 p-0 list-none">
        {#each templates as template (templateKey(template))}
          <li
            class="flex items-center gap-4 border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w [&+&]:border-t-0"
          >
            <span class="fr-icon-file-text-line flex-none" aria-hidden="true"></span><span
              class="min-w-0 flex-1 break-all">{template.name}</span
            >
            <button
              class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line flex-none"
              type="button"
              onclick={() => onRemove(template)}
              ><span class="fr-sr-only">Retirer {template.name}</span></button
            >
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
