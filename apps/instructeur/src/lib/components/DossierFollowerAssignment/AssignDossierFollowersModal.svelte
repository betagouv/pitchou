<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { store } from "$lib/state/store.svelte.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import { loadNotificationByDossierForCurrentInstructeur } from "$lib/shared/main.ts";
  import { queueDossierFollowUpdate } from "$lib/dossier/suiviDossier.ts";
  import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    dossierName: Dossier["name"];
    onClose: () => void;
  };

  let { dossierId, dossierName, onClose }: Props = $props();

  const titleId = $derived(`assign-dossier-followers-title-${dossierId}`);
  let dialogElement: HTMLDialogElement | undefined = $state();
  let candidates: DossierFollowerCandidate[] = $state([]);
  let selectedEmails: Set<string> = $state(new Set());
  let loading = $state(true);
  let loadFailed = $state(false);
  let saving = $state(false);
  let errorMessage = $state("");

  const followers = $derived(candidates.filter(({ email }) => selectedEmails.has(email)));
  const availableCandidates = $derived(
    candidates.filter(({ email }) => !selectedEmails.has(email)),
  );

  onMount(() => {
    dialogElement?.showModal();
    void loadCandidates();
  });

  async function loadCandidates() {
    const listCandidates = store.capabilities.listDossierFollowerCandidates;
    if (!listCandidates) {
      loading = false;
      loadFailed = true;
      errorMessage = "Vous n’avez pas les droits nécessaires pour attribuer ce dossier.";
      return;
    }

    try {
      candidates = await listCandidates(dossierId);
      selectedEmails = new Set(
        candidates.filter(({ followsDossier }) => followsDossier).map(({ email }) => email),
      );
    } catch (error) {
      console.error("Failed to load dossier follower candidates", error);
      loadFailed = true;
      errorMessage = "Impossible de charger les membres du groupe instructeur.";
    } finally {
      loading = false;
    }
  }

  function addFollower(email: string) {
    const next = new Set(selectedEmails);
    next.add(email);
    selectedEmails = next;
  }

  function removeFollower(email: string) {
    const next = new Set(selectedEmails);
    next.delete(email);
    selectedEmails = next;
  }

  async function submit() {
    const updateFollowers = store.capabilities.updateDossierFollowers;
    if (!updateFollowers) {
      errorMessage = "Vous n’avez pas les droits nécessaires pour attribuer ce dossier.";
      return;
    }

    saving = true;
    errorMessage = "";
    const addedPersonneEmails = candidates
      .filter(({ email, followsDossier }) => !followsDossier && selectedEmails.has(email))
      .map(({ email }) => email);
    const removedPersonneEmails = candidates
      .filter(({ email, followsDossier }) => followsDossier && !selectedEmails.has(email))
      .map(({ email }) => email);
    try {
      await queueDossierFollowUpdate(dossierId, () =>
        updateFollowers(dossierId, [...selectedEmails]),
      );

      const followRelations = store.followRelations ?? new SvelteMap();
      for (const { email } of candidates) {
        const followedDossierIds = followRelations.get(email) ?? new SvelteSet();
        if (selectedEmails.has(email)) followedDossierIds.add(dossierId);
        else followedDossierIds.delete(dossierId);
        followRelations.set(email, followedDossierIds);
      }
      store.followRelations = followRelations;

      const notificationPromise = loadNotificationByDossierForCurrentInstructeur();
      notificationPromise?.catch((error) =>
        console.warn("Failed to reload dossier notifications", error),
      );
      sendEvenement({
        type: "assignDossierFollowers",
        details: {
          dossierId,
          followerCount: selectedEmails.size,
          addedPersonneEmails,
          removedPersonneEmails,
        },
      });
      dialogElement?.close();
    } catch (error) {
      console.error("Failed to update dossier followers", error);
      errorMessage = "L’attribution du dossier a échoué. Veuillez réessayer.";
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
  class="w-[min(42rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
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
    class="flex h-[min(42rem,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] flex-col bg-[var(--background-default-grey)]"
  >
    <header
      class="flex items-start justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <div>
        <h2 id={titleId} class="fr-m-0">Faire suivre le dossier</h2>
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
      <p class="flex-none">
        Ajoutez ou retirez les membres du groupe instructeur qui doivent suivre ce dossier.
      </p>

      {#if loading}
        <p role="status">Chargement des membres du groupe instructeur…</p>
      {:else if candidates.length === 0 && !errorMessage}
        <p>Aucun membre n’est disponible dans ce groupe instructeur.</p>
      {:else}
        <div class="flex min-h-0 flex-1 flex-col gap-6">
          <section class="flex-none" aria-labelledby={`current-followers-title-${dossierId}`}>
            <h3 id={`current-followers-title-${dossierId}`} class="fr-h5 fr-mb-1w">
              Personnes qui suivent le dossier ({followers.length})
            </h3>
            {#if followers.length === 0}
              <p class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
                Personne ne suit ce dossier pour l’instant.
              </p>
            {:else}
              <ul
                class="list-none border border-[color:var(--border-default-grey)] fr-m-0 fr-p-0"
                aria-live="polite"
              >
                {#each followers as follower (follower.email)}
                  <li
                    class="flex items-center justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-py-1w fr-px-2w last:border-b-0"
                  >
                    <span class="min-w-0 [overflow-wrap:anywhere]">{follower.email}</span>
                    <button
                      type="button"
                      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-down-line flex-none"
                      aria-label={`Retirer ${follower.email} des personnes qui suivent le dossier`}
                      title={`Retirer ${follower.email}`}
                      disabled={saving}
                      onclick={() => removeFollower(follower.email)}
                    ></button>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>

          <section
            class="flex min-h-0 flex-1 flex-col"
            aria-labelledby={`available-candidates-title-${dossierId}`}
          >
            <h3 id={`available-candidates-title-${dossierId}`} class="fr-h5 flex-none fr-mb-1w">
              Personnes pouvant suivre le dossier ({availableCandidates.length})
            </h3>
            {#if availableCandidates.length === 0}
              <p class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
                Toutes les personnes du groupe instructeur suivent déjà ce dossier.
              </p>
            {:else}
              <ul
                class="min-h-0 flex-1 list-none overflow-y-auto border border-[color:var(--border-default-grey)] fr-m-0 fr-p-0"
                aria-live="polite"
              >
                {#each availableCandidates as candidate (candidate.email)}
                  <li
                    class="flex items-center justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-py-1w fr-px-2w last:border-b-0"
                  >
                    <span class="min-w-0 [overflow-wrap:anywhere]">{candidate.email}</span>
                    <button
                      type="button"
                      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-up-line flex-none"
                      aria-label={`Ajouter ${candidate.email} aux personnes qui suivent le dossier`}
                      title={`Ajouter ${candidate.email}`}
                      disabled={saving}
                      onclick={() => addFollower(candidate.email)}
                    ></button>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        </div>
      {/if}

      {#if errorMessage}
        <p class="fr-error-text fr-mt-2w" role="alert">{errorMessage}</p>
      {/if}
    </div>

    <footer
      class="flex flex-wrap justify-end gap-4 border-t border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={close}
        >Annuler</button
      >
      <button
        type="button"
        class="fr-btn"
        disabled={loading || loadFailed || saving}
        aria-busy={saving}
        onclick={submit}
      >
        {saving ? "Attribution en cours…" : "Attribuer le dossier"}
      </button>
    </footer>
  </div>
</dialog>
