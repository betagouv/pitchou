<script lang="ts">
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";
  import ApiIntegrationDialog from "./ApiIntegrationDialog.svelte";

  let {
    onClose,
    onCreated,
  }: {
    onClose: () => void;
    onCreated: (id: string) => void;
  } = $props();

  const formId = $props.id();
  const title = "Ajouter un service";
  let nameInput: HTMLInputElement;
  let name = $state("");
  let saving = $state(false);
  let failure = $state("");

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

<ApiIntegrationDialog {title} {onClose} busy={saving} initialFocus={() => nameInput.focus()}>
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
    <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={onClose}>
      Annuler
    </button>
    <button type="submit" form={formId} class="fr-btn" disabled={saving || !name.trim()}>
      {saving ? "Ajout…" : title}
    </button>
  {/snippet}
</ApiIntegrationDialog>
