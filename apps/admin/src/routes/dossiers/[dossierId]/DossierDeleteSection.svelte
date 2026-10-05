<script lang="ts">
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { goto } from "$app/navigation";

  import { deleteDossier } from "$lib/actions/adminDossiers.ts";

  let { dossierId }: { dossierId: number } = $props();

  let confirming = $state(false);
  let deleting = $state(false);
  let error = $state<string | null>(null);

  async function confirmDelete() {
    deleting = true;
    error = null;
    try {
      pageHeader.clearFeedback();
      await deleteDossier(dossierId);
      await goto("/dossiers");
      pageHeader.showSaved("Dossier supprimé");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      deleting = false;
    }
  }
</script>

<section class="admin-panel">
  <h2>Supprimer le dossier</h2>
  {#if !confirming}
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
      onclick={() => (confirming = true)}
    >
      Supprimer ce dossier
    </button>
  {:else}
    <div class="fr-alert fr-alert--warning fr-mb-2w">
      <p>
        La suppression est définitive : le dossier, ses évènements, avis, décisions et fichiers
        seront supprimés.
      </p>
    </div>
    {#if error}
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
        <p>{error}</p>
      </div>
    {/if}
    <div class="flex flex-row gap-4">
      <button type="button" class="fr-btn" disabled={deleting} onclick={confirmDelete}>
        {deleting ? "Suppression…" : "Confirmer la suppression"}
      </button>
      <button type="button" class="fr-btn fr-btn--secondary" onclick={() => (confirming = false)}>
        Annuler
      </button>
    </div>
  {/if}
</section>
