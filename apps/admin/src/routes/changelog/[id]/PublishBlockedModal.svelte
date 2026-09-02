<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";

  let {
    titreOk,
    versionOk,
    onClose,
  }: { titreOk: boolean; versionOk: boolean; onClose: () => void } = $props();
</script>

{#snippet footer()}
  <button type="button" class="fr-btn ml-auto" onclick={onClose}>Compris</button>
{/snippet}

{#snippet requirement(label: string, met: boolean)}
  <li class="flex items-center gap-2">
    <span
      class="{met
        ? 'fr-icon-checkbox-circle-line text-green-700'
        : 'fr-icon-close-circle-line text-red-600'} shrink-0"
      aria-hidden="true"
    ></span>
    <span>
      {label}
      <span class="sr-only">{met ? "(renseigné)" : "(manquant)"}</span>
    </span>
  </li>
{/snippet}

<Modal title="Publication impossible pour le moment" {onClose} {footer}>
  <div class="fr-p-3w">
    <p class="fr-mb-2w">
      Pour publier cette entrée sur la page « Nouveautés », il faut d'abord&nbsp;:
    </p>
    <ul class="m-0 flex list-none flex-col gap-2 p-0">
      {@render requirement("Un titre", titreOk)}
      {@render requirement("Une version complète (X.Y.Z)", versionOk)}
    </ul>
    <p class="fr-mb-0 fr-mt-2w text-sm text-gray-600">
      L'entrée reste enregistrée en brouillon en attendant.
    </p>
  </div>
</Modal>
