<script lang="ts">
  import { onMount } from "svelte";
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";

  import Loader from "@pitchou/ui/Loader.svelte";
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import EntryFields from "./EntryFields.svelte";
  import SaveStatus from "./SaveStatus.svelte";
  import PublishBlockedModal from "./PublishBlockedModal.svelte";
  import { Autosave } from "./autosave.svelte.ts";
  import { EntryModel, sameSnapshot } from "./entryModel.svelte.ts";
  import { formatDate } from "../format.ts";
  import {
    loadChangelogAdmin,
    saveChangelogEntry,
    uploadChangelogMedia,
    cleanupChangelogMedia,
    type ChangelogEntryPayload,
  } from "$lib/actions/adminChangelog.ts";
  import { AccessDeniedError } from "$lib/actions/errors.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";

  // The draft is created by the list page's "+" before we get here, so the
  // entry always exists: this page only ever edits.
  const idParam = page.params.id!;
  const entryId = /^\d+$/.test(idParam) ? Number(idParam) : null;

  type Etat = "chargement" | "autorise" | "refuse" | "introuvable";
  let etat = $state<Etat>("chargement");
  let loadError = $state<string | null>(null);

  const model = new EntryModel();

  // Clicking the switch while requirements are missing explains them instead
  // of silently refusing (a disabled button would only show a blocked cursor).
  let publishBlockedOpen = $state(false);

  function togglePublished() {
    if (model.published) {
      model.published = false;
      return;
    }
    if (!model.canPublish) {
      publishBlockedOpen = true;
      return;
    }
    model.published = true;
  }

  const autosave = new Autosave<ChangelogEntryPayload>({
    snapshot: () => model.snapshot(),
    equals: sameSnapshot,
    canSave: (snapshot) => snapshot.date !== "",
    save: (snapshot) => saveChangelogEntry(entryId!, snapshot),
    delay: 800,
  });

  async function load() {
    etat = "chargement";
    loadError = null;
    try {
      const entries = await loadChangelogAdmin();
      const entry =
        entryId === null ? undefined : entries.find((candidate) => candidate.id === entryId);
      if (!entry) {
        etat = "introuvable";
        return;
      }
      model.loadFrom(entry);
      autosave.lastSaved = model.snapshot();
      etat = "autorise";
    } catch (e) {
      if (!(e instanceof AccessDeniedError)) {
        loadError = e instanceof Error ? e.message : String(e);
      }
      etat = "refuse";
    }
  }

  onMount(() => {
    void load();
    // Purge media orphaned by a previous session that closed without cleaning up.
    if (entryId !== null) void cleanupChangelogMedia(entryId).catch(() => {});
  });

  // The shell header shows what this entry is, following the edited version live.
  $effect(() => {
    if (etat !== "autorise") return;
    pageHeader.setTitle(
      model.version !== null
        ? `Version ${model.version} — ${formatDate(model.date)}`
        : `Brouillon du ${formatDate(model.date)}`,
    );
    return () => pageHeader.clearTitle();
  });

  // Autosave: any edit (re)schedules a debounced save.
  $effect(() => {
    const snapshot = model.snapshot();
    if (etat !== "autorise" || autosave.isSaved(snapshot)) return;
    autosave.schedule();
  });

  // Leaving the page flushes a pending save, then purges media that the saved
  // contenu no longer references. Not purging on every autosave keeps Ctrl+Z
  // working on a just-removed image during the editing session.
  beforeNavigate(() => void flushThenCleanupMedia());

  async function flushThenCleanupMedia() {
    await autosave.flush();
    // After a failed save the stored contenu lags behind the editor: skip the
    // purge rather than risk deleting media a later successful save references.
    if (entryId !== null && autosave.state !== "error") {
      void cleanupChangelogMedia(entryId).catch(() => {});
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
{:else if etat === "introuvable"}
  <div class="mt-2 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
    <p class="fr-mb-1v font-medium">Entrée introuvable</p>
    <p class="fr-mb-0 text-sm">
      Cette entrée n'existe pas (ou plus). <a class="fr-link" href="/changelog">Retour à la liste</a
      >
    </p>
  </div>
{:else}
  {#snippet saveStatus()}
    <SaveStatus state={autosave.state} error={autosave.error} />
  {/snippet}

  <div class="flex min-h-0 flex-1 flex-col">
    <EntryFields
      bind:titre={model.titre}
      bind:versionMajor={model.versionMajor}
      bind:versionMinor={model.versionMinor}
      bind:versionPatch={model.versionPatch}
      bind:date={model.date}
      published={model.published}
      onToggleStatus={togglePublished}
    />

    <div class="fr-input-group flex min-h-0 flex-1 flex-col fr-mb-0">
      <span class="fr-label fr-mb-1w shrink-0">Contenu</span>
      <RichTextEditor
        bind:html={model.contenu}
        toolbarEnd={saveStatus}
        uploadMedia={(file) => uploadChangelogMedia(entryId!, file)}
      />
    </div>
  </div>

  {#if publishBlockedOpen}
    <PublishBlockedModal
      titreOk={model.titre.trim() !== ""}
      versionOk={model.versionComplete}
      onClose={() => (publishBlockedOpen = false)}
    />
  {/if}
{/if}
