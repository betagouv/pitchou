<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import {
    loadChangelogAdmin,
    createChangelogEntry,
    deleteChangelogEntry,
    type ChangelogEntryAdmin,
  } from "$lib/actions/adminChangelog.ts";
  import { AccessDeniedError } from "$lib/actions/errors.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let entries = $state<ChangelogEntryAdmin[]>([]);
  let loadError = $state<string | null>(null);

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      entries = await loadChangelogAdmin();
      etat = "autorise";
    } catch (e) {
      if (!(e instanceof AccessDeniedError)) {
        // Real (network/server) error: keep the admin UI hidden, show a generic alert.
        loadError = e instanceof Error ? e.message : String(e);
      }
      etat = "refuse";
    }
  }

  onMount(load);

  // The "new entry" entry point lives in the shell header ("+"): it creates an
  // empty draft right away and opens its editor — titre and version come later.
  let creatingDraft = false;
  let creationError = $state<string | null>(null);

  function todayAsString(): string {
    // Local date, not toISOString(): UTC would shift the day around midnight.
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  async function createDraft() {
    if (creatingDraft) return;
    creatingDraft = true;
    creationError = null;
    try {
      const id = await createChangelogEntry({
        version_major: null,
        version_minor: null,
        version_patch: null,
        date: todayAsString(),
        titre: "",
        contenu: "",
        published: false,
      });
      await goto(`/changelog/${id}`);
    } catch (e) {
      creationError = e instanceof Error ? e.message : String(e);
    } finally {
      creatingDraft = false;
    }
  }

  $effect(() => {
    pageHeader.setAction({ label: "Nouvelle entrée", onClick: () => void createDraft() });
    return () => pageHeader.clearAction();
  });

  function formatDate(date: string): string {
    // Noon keeps the plain YYYY-MM-DD date on the right day in every timezone.
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTimestamp(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("fr-FR");
  }

  /** « X.Y.Z » when complete, `null` while the version is empty or half-typed. */
  function versionOf(entry: ChangelogEntryAdmin): string | null {
    const { version_major, version_minor, version_patch } = entry;
    if (version_major === null || version_minor === null || version_patch === null) return null;
    return `${version_major}.${version_minor}.${version_patch}`;
  }

  let entryToDelete = $state<ChangelogEntryAdmin | null>(null);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  function requestDelete(entry: ChangelogEntryAdmin) {
    entryToDelete = entry;
    deleteError = null;
  }

  function closeDeleteModal() {
    if (deleting) return;
    entryToDelete = null;
    deleteError = null;
  }

  async function confirmDelete() {
    if (!entryToDelete || deleting) return;
    deleting = true;
    deleteError = null;
    try {
      await deleteChangelogEntry(entryToDelete.id);
      entries = await loadChangelogAdmin();
      entryToDelete = null;
    } catch (e) {
      deleteError = e instanceof Error ? e.message : String(e);
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:head>
  <title>Administration - changelog — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement du changelog</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <!-- Admin-only page: layout deliberately deviates from the DSFR where it helps. -->
  {#if creationError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <p>{creationError}</p>
    </div>
  {/if}

  {#if entries.length === 0}
    <div class="mt-2 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
      <p class="fr-mb-1v font-medium">Aucune entrée pour le moment</p>
      <p class="fr-mb-0 text-sm">
        Créez la première entrée avec le bouton «&nbsp;+&nbsp;» en haut de page.
      </p>
    </div>
  {:else}
    <ul class="mt-2 flex list-none flex-col gap-2 p-0">
      {#each entries as entry (entry.id)}
        <li
          class="group relative rounded-lg border border-solid border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <a href={`/changelog/${entry.id}`} class="fr-raw-link block p-4 pr-24 no-underline">
            <div class="flex flex-wrap items-center gap-3">
              {#if versionOf(entry)}
                <span class="font-semibold">Version {versionOf(entry)}</span>
              {:else}
                <span class="font-semibold text-gray-400 italic">Sans version</span>
              {/if}
              <span class="text-sm text-gray-500">{formatDate(entry.date)}</span>
              {#if entry.published}
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-solid border-green-700/40 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800"
                >
                  <span class="size-1.5 rounded-full bg-green-600" aria-hidden="true"></span>
                  Publiée
                </span>
              {:else}
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-solid border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  <span class="size-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
                  Brouillon
                </span>
              {/if}
            </div>
            <p class="fr-mb-0 mt-1 truncate text-lg">
              {#if entry.titre}{entry.titre}{:else}<span class="text-gray-400 italic"
                  >Sans titre</span
                >{/if}
            </p>
            <p class="fr-mb-0 mt-1 text-sm text-gray-500">
              Modifiée le {formatTimestamp(entry.updated_at)} par {entry.updated_by}
            </p>
          </a>
          <span
            class="fr-icon-arrow-right-s-line absolute top-1/2 right-14 -translate-y-1/2 text-gray-300 transition group-hover:text-blue-500"
            aria-hidden="true"
          ></span>
          <button
            type="button"
            class="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            title={versionOf(entry)
              ? `Supprimer la version ${versionOf(entry)}`
              : "Supprimer le brouillon"}
            onclick={() => requestDelete(entry)}
          >
            <span class="fr-icon-delete-line" aria-hidden="true"></span>
            <span class="sr-only">
              {versionOf(entry)
                ? `Supprimer la version ${versionOf(entry)}`
                : "Supprimer le brouillon"}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#snippet deleteFooter()}
    <button
      type="button"
      class="fr-btn fr-btn--secondary ml-auto"
      onclick={closeDeleteModal}
      disabled={deleting}
    >
      Annuler
    </button>
    <button
      type="button"
      class="fr-btn bg-red-600 hover:bg-red-700"
      onclick={confirmDelete}
      disabled={deleting}
    >
      {#if deleting}
        <span class="fr-icon-refresh-line inline-block animate-spin fr-mr-1w" aria-hidden="true"
        ></span>
        Suppression…
      {:else}
        Supprimer
      {/if}
    </button>
  {/snippet}

  {#if entryToDelete}
    <Modal title="Supprimer l'entrée" onClose={closeDeleteModal} footer={deleteFooter}>
      <div class="fr-p-3w">
        <p class="fr-mb-1w">
          {#if versionOf(entryToDelete)}
            Supprimer la version <strong>{versionOf(entryToDelete)}</strong>
            («&nbsp;{entryToDelete.titre || "Sans titre"}&nbsp;»)&nbsp;?
          {:else}
            Supprimer ce brouillon du <strong>{formatDate(entryToDelete.date)}</strong>&nbsp;?
          {/if}
        </p>
        {#if entryToDelete.published}
          <p class="fr-mb-0 text-sm text-gray-600">
            Elle disparaîtra immédiatement de la page publique « Nouveautés ».
          </p>
        {:else}
          <p class="fr-mb-0 text-sm text-gray-600">Cette action est définitive.</p>
        {/if}
        {#if deleteError}
          <p class="fr-error-text fr-mt-2w fr-mb-0">
            Échec de la suppression : {deleteError}
          </p>
        {/if}
      </div>
    </Modal>
  {/if}
{/if}
