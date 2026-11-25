<script lang="ts">
  import { onMount } from "svelte";
  import Modal from "#lib/components/Modal.svelte";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";

  let {
    onClose,
    onCreated,
  }: {
    onClose: () => void;
    onCreated: (id: string) => void;
  } = $props();

  const formId = $props.id();
  const title = "Ajouter un service";
  let dialog: HTMLDialogElement;
  let nameInput: HTMLInputElement;
  let name = $state("");
  let saving = $state(false);
  let failure = $state("");

  onMount(() => {
    dialog.showModal();
    nameInput.focus();
    return () => dialog.close();
  });

  function close() {
    if (!saving) onClose();
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    saving = true;
    failure = "";
    try {
      const response = await apiSettingsRequest("/api/integrations-api", "POST", { name });
      const { id } = await response.json();
      onCreated(id);
    } catch (error) {
      failure = error instanceof Error ? error.message : "Création du service impossible.";
    } finally {
      saving = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-[var(--text-default-grey)] backdrop:bg-transparent"
  aria-label={title}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
>
  <Modal {title} onClose={close} insideNativeDialog>
    <form id={formId} onsubmit={create} autocomplete="off" class="fr-p-3w">
      <div class="fr-input-group m-0!">
        <label class="fr-label" for={`${formId}-name`}>Nom du service</label>
        <input
          id={`${formId}-name`}
          class="fr-input"
          type="text"
          autocomplete="off"
          bind:this={nameInput}
          bind:value={name}
          maxlength="80"
          required
          disabled={saving}
        />
      </div>
      {#if failure}
        <p class="fr-error-text fr-mt-2w fr-mb-0" role="alert">{failure}</p>
      {/if}
    </form>
    {#snippet footer()}
      <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={close}>
        Annuler
      </button>
      <button type="submit" form={formId} class="fr-btn" disabled={saving || !name.trim()}>
        {saving ? "Ajout…" : title}
      </button>
    {/snippet}
  </Modal>
</dialog>
