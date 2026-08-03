<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import {
    createDossierDraft,
    loadGroupesInstructeurs,
    type AdminGroupeInstructeurs,
  } from "$lib/actions/adminDossiers.ts";

  let { onClose }: { onClose: () => void } = $props();
  let name = $state("");
  let groupeInstructeurs = $state("");
  let groupes = $state<AdminGroupeInstructeurs[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let nameInput = $state<HTMLInputElement>();

  onMount(async () => {
    nameInput?.focus();
    try {
      groupes = await loadGroupesInstructeurs();
      groupeInstructeurs = groupes[0]?.id ?? "";
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    } finally {
      loading = false;
    }
  });

  async function create(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;
    try {
      const { id } = await createDossierDraft({
        name: name.trim(),
        groupe_instructeurs: groupeInstructeurs,
      });
      await goto(`/dossiers/${id}`);
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
  class="fixed inset-0 z-[1000] bg-[rgba(0,0,0,0.4)] flex items-start justify-center fr-py-4w fr-px-2w overflow-y-auto"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && close()}
>
  <div
    class="bg-[var(--background-default-grey)] rounded-lg w-full max-w-2xl shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-draft-title"
  >
    <header
      class="flex items-center gap-4 fr-py-2w fr-px-3w border-b border-[color:var(--border-default-grey)]"
    >
      <h2 class="fr-h4 fr-mb-0 mr-auto" id="create-draft-title">Créer un brouillon de dossier</h2>
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
        <p class="fr-hint-text">
          Le créateur est automatiquement identifié à partir de votre compte administrateur.
        </p>
        <div class="fr-input-group">
          <label class="fr-label" for="draft-name">Nom du dossier *</label>
          <input
            class="fr-input"
            id="draft-name"
            required
            disabled={saving}
            bind:this={nameInput}
            bind:value={name}
          />
        </div>
        <div class="fr-select-group">
          <label class="fr-label" for="draft-groupe">Groupe instructeurs *</label>
          <select
            class="fr-select"
            id="draft-groupe"
            required
            disabled={loading || saving}
            bind:value={groupeInstructeurs}
          >
            {#each groupes as groupe (groupe.id)}
              <option value={groupe.id}>{groupe.name}</option>
            {/each}
          </select>
        </div>
        {#if error}
          <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{error}</p></div>
        {/if}
      </div>
      <footer
        class="flex items-center gap-3 flex-wrap fr-py-2w fr-px-3w border-t border-[color:var(--border-default-grey)]"
      >
        <button class="fr-btn" type="submit" disabled={loading || saving || !groupeInstructeurs}>
          {saving ? "Création…" : "Créer le brouillon"}
        </button>
        <button class="fr-btn fr-btn--secondary" type="button" disabled={saving} onclick={close}>
          Annuler
        </button>
      </footer>
    </form>
  </div>
</div>
