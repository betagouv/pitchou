<script lang="ts">
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Select from "@pitchou/ui/Select.svelte";

  import { createMinimalDossier } from "$lib/actions/adminDossiers.ts";
  import { departements } from "@pitchou/common/departements.ts";

  let { onClose }: { onClose: () => void } = $props();
  let name = $state("");
  let department = $state("");
  let saving = $state(false);
  let error = $state<string | null>(null);
  let nameInput = $state<HTMLInputElement>();

  onMount(() => {
    nameInput?.focus();
  });

  async function create(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;
    try {
      pageHeader.clearFeedback();
      const { id } = await createMinimalDossier({
        name: name.trim(),
        primary_department: department,
      });
      await goto(`/dossiers/${id}`);
      pageHeader.showSaved("Dossier créé");
    } catch (creationError) {
      error = creationError instanceof Error ? creationError.message : String(creationError);
      saving = false;
    }
  }

  function close() {
    if (!saving) onClose();
  }
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && close()} />

<div
  class="fixed inset-0 z-[1000] pitchou-dialog-overlay flex items-start justify-center fr-py-4w fr-px-2w overflow-y-auto"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && close()}
>
  <div
    class="pitchou-dialog rounded-lg w-full max-w-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-dossier-title"
  >
    <header
      class="flex items-center gap-4 fr-py-2w fr-px-3w border-b border-[color:var(--border-default-grey)]"
    >
      <h2 class="fr-mb-0 mr-auto text-xl" id="create-dossier-title">Créer un dossier</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer"
        aria-label="Fermer"
        disabled={saving}
        onclick={close}
      ></button>
    </header>

    <form onsubmit={create}>
      <div class="fr-p-3w">
        <div class="fr-input-group">
          <label class="fr-label" for="new-dossier-name">Nom du dossier *</label>
          <input
            class="fr-input"
            id="new-dossier-name"
            required
            disabled={saving}
            bind:this={nameInput}
            bind:value={name}
          />
        </div>
        <div class="fr-select-group">
          <label class="fr-label" for="new-dossier-groupe">Département principal *</label>
          <Select
            id="new-dossier-groupe"
            class="fr-mt-1w"
            required
            disabled={saving}
            options={departements.map(({ code, name }) => ({
              value: code,
              label: `${code} - ${name}`,
            }))}
            bind:value={department}
          />
        </div>
        {#if error}
          <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{error}</p></div>
        {/if}
      </div>
      <footer
        class="flex items-center gap-3 flex-wrap fr-py-2w fr-px-3w border-t border-[color:var(--border-default-grey)]"
      >
        <button class="fr-btn" type="submit" disabled={saving || !department}>
          {saving ? "Création…" : "Créer le dossier"}
        </button>
        <button class="fr-btn fr-btn--secondary" type="button" disabled={saving} onclick={close}>
          Annuler
        </button>
      </footer>
    </form>
  </div>
</div>
