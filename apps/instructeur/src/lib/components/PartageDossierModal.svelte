<script lang="ts">
  import { onMount } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import PartageDossierLink from "./PartageDossierModal/PartageDossierLink.svelte";
  import type { DossierPartageCandidate } from "@pitchou/types/capabilities.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";

  type Props = {
    dossierId: Dossier["id"];
    dossierName: Dossier["name"];
    onClose: () => void;
  };

  let { dossierId, dossierName, onClose }: Props = $props();

  const titleId = $derived(`partage-dossier-title-${dossierId}`);
  const helpId = $derived(`partage-dossier-help-${dossierId}`);
  let dialogElement: HTMLDialogElement | undefined = $state();
  let candidates: DossierPartageCandidate[] = $state([]);
  let selectedIds: Set<GroupeInstructeurs["id"]> = $state(new Set());
  let loading = $state(true);
  let loadFailed = $state(false);
  let saving = $state(false);
  let errorMessage = $state("");

  // Only worth showing once at least one service can actually open it.
  const shared = $derived(selectedIds.size > 0);

  onMount(() => {
    dialogElement?.showModal();
    void loadCandidates();
  });

  async function loadCandidates() {
    const listCandidates = store.capabilities.listDossierPartageCandidates;
    if (!listCandidates) {
      loading = false;
      loadFailed = true;
      errorMessage = "Vous n’avez pas les droits nécessaires pour partager ce dossier.";
      return;
    }

    try {
      candidates = await listCandidates(dossierId);
      selectedIds = new Set(
        candidates.filter(({ sharesDossier }) => sharesDossier).map(({ id }) => id),
      );
    } catch (error) {
      console.error("Failed to load dossier partage candidates", error);
      loadFailed = true;
      errorMessage = "Impossible de charger la liste des services.";
    } finally {
      loading = false;
    }
  }

  function toggle(id: GroupeInstructeurs["id"]) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  async function submit() {
    const updatePartages = store.capabilities.updateDossierPartages;
    if (!updatePartages) {
      errorMessage = "Vous n’avez pas les droits nécessaires pour partager ce dossier.";
      return;
    }

    saving = true;
    errorMessage = "";
    try {
      await updatePartages(dossierId, [...selectedIds]);
      // The metric event is recorded server-side, with the historique entries.
      dialogElement?.close();
    } catch (error) {
      console.error("Failed to update dossier partages", error);
      errorMessage = "Le partage du dossier a échoué. Veuillez réessayer.";
    } finally {
      saving = false;
    }
  }

  function close() {
    if (!saving) dialogElement?.close();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="w-[min(48rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  style="margin: auto;"
  aria-labelledby={titleId}
  onclose={onClose}
  oncancel={(event) => {
    if (saving) event.preventDefault();
  }}
  onclick={(event) => {
    if (event.target === dialogElement) close();
  }}
>
  <div
    class="flex h-[min(52rem,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] flex-col bg-[var(--background-default-grey)]"
  >
    <header
      class="flex items-start justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <div>
        <h2 id={titleId} class="fr-m-0">Partager le dossier en lecture seule</h2>
        <p class="fr-mt-1w fr-mb-0 text-[color:var(--text-mention-grey)]">
          {dossierName || `Dossier n°${dossierId}`}
        </p>
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer"
        disabled={saving}
        onclick={close}>Fermer</button
      >
    </header>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden fr-p-3w">
      <p id={helpId} class="flex-none fr-mb-2w">
        Les services sélectionnés pourront consulter ce dossier sans jamais le modifier. Ils n’en
        verront ni les commentaires, ni l’historique, ni les saisines, ni les prescriptions.
      </p>

      {#if loading}
        <p role="status">Chargement de la liste des services…</p>
      {:else if candidates.length === 0 && !errorMessage}
        <p>Aucun autre service n’est disponible pour cette démarche.</p>
      {:else if !loadFailed}
        <!-- Only the list scrolls, so the link stays in sight however many
             services the démarche has. -->
        <fieldset class="fr-fieldset min-h-0 flex-1 overflow-y-auto" aria-describedby={helpId}>
          <legend class="fr-fieldset__legend fr-sr-only">Services avec qui partager</legend>
          {#each candidates as candidate (candidate.id)}
            <div class="fr-fieldset__element">
              <div class="fr-checkbox-group">
                <input
                  type="checkbox"
                  id={`partage-${dossierId}-${candidate.id}`}
                  checked={selectedIds.has(candidate.id)}
                  disabled={saving}
                  onchange={() => toggle(candidate.id)}
                />
                <label class="fr-label" for={`partage-${dossierId}-${candidate.id}`}>
                  {candidate.name}
                </label>
              </div>
            </div>
          {/each}
        </fieldset>

        {#if shared}
          <div class="flex-none">
            <PartageDossierLink {dossierId} />
          </div>
        {/if}
      {/if}

      {#if errorMessage}
        <p class="fr-error-text fr-mt-2w" role="alert">{errorMessage}</p>
      {/if}
    </div>

    <footer
      class="flex flex-none justify-end gap-4 border-t border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={close}>
        Annuler
      </button>
      <button
        type="button"
        class="fr-btn"
        disabled={loading || loadFailed || saving}
        onclick={submit}
      >
        {saving ? "Enregistrement…" : "Enregistrer le partage"}
      </button>
    </footer>
  </div>
</dialog>
