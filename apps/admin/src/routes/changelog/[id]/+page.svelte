<script lang="ts">
  import { onMount } from "svelte";
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";

  import Loader from "@pitchou/ui/Loader.svelte";
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import { loadChangelogAdmin, saveChangelogEntry } from "$lib/actions/adminChangelog.ts";
  import { AccessDeniedError } from "$lib/actions/errors.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";

  // The draft is created by the list page's "+" before we get here, so the
  // entry always exists: this page only ever edits.
  const idParam = page.params.id!;
  const entryId = /^\d+$/.test(idParam) ? Number(idParam) : null;

  type Etat = "chargement" | "autorise" | "refuse" | "introuvable";
  let etat = $state<Etat>("chargement");
  let loadError = $state<string | null>(null);

  let date = $state("");
  let titre = $state("");
  let contenu = $state("");
  let published = $state(false);

  // One field per version segment: each one saves on its own, so a half-typed
  // version is persisted like anything else. Completeness only gates publishing.
  let versionMajor = $state("");
  let versionMinor = $state("");
  let versionPatch = $state("");
  const versionComplete = $derived(
    versionMajor !== "" && versionMinor !== "" && versionPatch !== "",
  );
  const version = $derived(
    versionComplete ? `${versionMajor}.${versionMinor}.${versionPatch}` : null,
  );
  const canPublish = $derived(titre.trim() !== "" && versionComplete);

  // Clicking the switch while requirements are missing explains them instead
  // of silently refusing (a disabled button would only show a blocked cursor).
  let publishBlockedOpen = $state(false);

  function togglePublished() {
    if (published) {
      published = false;
      return;
    }
    if (!canPublish) {
      publishBlockedOpen = true;
      return;
    }
    published = true;
  }

  function toSegmentNumber(segment: string): number | null {
    return segment === "" ? null : Number(segment);
  }

  function toSegmentText(segment: number | null): string {
    return segment === null ? "" : String(segment);
  }

  function onSegmentInput(
    event: Event & { currentTarget: HTMLInputElement },
    assign: (digits: string) => void,
  ) {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 4);
    event.currentTarget.value = digits;
    assign(digits);
  }

  type Snapshot = {
    version_major: number | null;
    version_minor: number | null;
    version_patch: number | null;
    date: string;
    titre: string;
    contenu: string;
    published: boolean;
  };
  type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
  const AUTOSAVE_DELAY = 800;

  let saveState = $state<SaveState>("idle");
  let saveError = $state<string | null>(null);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  // Guards against a finished save clobbering the status of a newer edit.
  let changeCounter = 0;
  let saveInFlight = false;
  let lastSaved: Snapshot | null = null;

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
      versionMajor = toSegmentText(entry.version_major);
      versionMinor = toSegmentText(entry.version_minor);
      versionPatch = toSegmentText(entry.version_patch);
      date = entry.date;
      titre = entry.titre;
      contenu = entry.contenu;
      published = entry.published;
      lastSaved = {
        version_major: entry.version_major,
        version_minor: entry.version_minor,
        version_patch: entry.version_patch,
        date: entry.date,
        titre: entry.titre,
        contenu: entry.contenu,
        published: entry.published,
      };
      etat = "autorise";
    } catch (e) {
      if (!(e instanceof AccessDeniedError)) {
        loadError = e instanceof Error ? e.message : String(e);
      }
      etat = "refuse";
    }
  }

  onMount(load);

  function formatDate(value: string): string {
    // Noon keeps the plain YYYY-MM-DD date on the right day in every timezone.
    return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // The shell header shows what this entry is, following the edited version live.
  $effect(() => {
    if (etat !== "autorise") return;
    pageHeader.setTitle(
      version !== null
        ? `Version ${version} — ${formatDate(date)}`
        : `Brouillon du ${formatDate(date)}`,
    );
    return () => pageHeader.clearTitle();
  });

  function currentSnapshot(): Snapshot {
    return {
      version_major: toSegmentNumber(versionMajor),
      version_minor: toSegmentNumber(versionMinor),
      version_patch: toSegmentNumber(versionPatch),
      date,
      titre,
      contenu,
      published,
    };
  }

  function isSaved(snapshot: Snapshot): boolean {
    return (
      lastSaved !== null &&
      lastSaved.version_major === snapshot.version_major &&
      lastSaved.version_minor === snapshot.version_minor &&
      lastSaved.version_patch === snapshot.version_patch &&
      lastSaved.date === snapshot.date &&
      lastSaved.titre === snapshot.titre &&
      lastSaved.contenu === snapshot.contenu &&
      lastSaved.published === snapshot.published
    );
  }

  // Autosave: any edit (re)schedules a debounced save.
  $effect(() => {
    const snapshot = currentSnapshot();
    if (etat !== "autorise" || isSaved(snapshot)) return;
    changeCounter++;
    saveState = "pending";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveNow(), AUTOSAVE_DELAY);
  });

  async function saveNow() {
    if (entryId === null) return;
    if (saveInFlight) {
      // A save is already on the wire; try again once it lands.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void saveNow(), AUTOSAVE_DELAY);
      return;
    }
    const snapshot = currentSnapshot();
    if (snapshot.date === "") return;
    const counter = changeCounter;
    saveState = "saving";
    saveInFlight = true;
    try {
      await saveChangelogEntry(entryId, snapshot);
      lastSaved = snapshot;
      if (counter === changeCounter) {
        saveState = "saved";
        saveError = null;
      }
    } catch (e) {
      if (counter === changeCounter) {
        saveState = "error";
        saveError = e instanceof Error ? e.message : String(e);
      }
    } finally {
      saveInFlight = false;
    }
  }

  // Leaving the page flushes a pending save instead of losing it.
  beforeNavigate(() => {
    if (saveState === "pending") {
      clearTimeout(saveTimer);
      void saveNow();
    }
  });
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
    <div role="status" aria-live="polite">
      {#if saveState === "error"}
        <p class="fr-text--sm fr-error-text fr-mt-0 fr-mb-0">
          Échec de l'enregistrement : {saveError}
        </p>
      {:else if saveState === "pending" || saveState === "saving"}
        <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
          <span class="fr-icon-refresh-line inline-block animate-spin fr-mr-1v" aria-hidden="true"
          ></span>
          Enregistrement…
        </p>
      {:else if saveState === "saved"}
        <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
          <span class="fr-icon-check-line fr-mr-1v" aria-hidden="true"></span>
          Enregistré
        </p>
      {:else}
        <p class="fr-text--sm fr-text-mention--grey fr-mb-0">Enregistrement automatique</p>
      {/if}
    </div>
  {/snippet}

  <div class="flex min-h-0 flex-1 flex-col">
    <div class="fr-mb-3w flex shrink-0 items-end gap-6">
      <div class="fr-input-group fr-mb-0 flex-1">
        <label class="fr-label" for="changelog-titre">Titre</label>
        <input class="fr-input" type="text" id="changelog-titre" bind:value={titre} />
      </div>

      <div class="shrink-0">
        <span class="fr-label" id="changelog-version-label">Version</span>
        <div
          class="mt-2 flex items-center gap-1"
          role="group"
          aria-labelledby="changelog-version-label"
        >
          <input
            class="fr-input w-16 text-center"
            type="text"
            inputmode="numeric"
            aria-label="Version majeure"
            placeholder="1"
            value={versionMajor}
            oninput={(event) => onSegmentInput(event, (digits) => (versionMajor = digits))}
          />
          <span class="font-semibold text-gray-500" aria-hidden="true">.</span>
          <input
            class="fr-input w-16 text-center"
            type="text"
            inputmode="numeric"
            aria-label="Version mineure"
            placeholder="0"
            value={versionMinor}
            oninput={(event) => onSegmentInput(event, (digits) => (versionMinor = digits))}
          />
          <span class="font-semibold text-gray-500" aria-hidden="true">.</span>
          <input
            class="fr-input w-16 text-center"
            type="text"
            inputmode="numeric"
            aria-label="Version correctif"
            placeholder="0"
            value={versionPatch}
            oninput={(event) => onSegmentInput(event, (digits) => (versionPatch = digits))}
          />
        </div>
      </div>

      <div class="w-56 shrink-0">
        <label class="fr-label" for="changelog-date">Date</label>
        <div class="mt-2">
          <DatePicker
            id="changelog-date"
            label="Date de l'entrée"
            value={date}
            onChange={(value) => (date = value ?? "")}
          />
        </div>
      </div>

      <!-- Custom switch (admin-only page, so we allow ourselves to deviate from the DSFR). -->
      <div class="shrink-0">
        <span class="fr-label" id="changelog-statut-label">Statut</span>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          aria-labelledby="changelog-statut-label"
          title="Publiée = visible sur la page « Nouveautés »"
          class="mt-2 flex h-10 cursor-pointer items-center gap-3 rounded-md border border-solid px-3 transition-colors {published
            ? 'border-green-700/40 bg-green-50'
            : 'border-gray-300 bg-gray-100'}"
          onclick={togglePublished}
        >
          <span
            class="relative inline-block h-5 w-9 rounded-full transition-colors {published
              ? 'bg-green-700'
              : 'bg-gray-400'}"
            aria-hidden="true"
          >
            <span
              class="absolute top-0.5 left-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform {published
                ? 'translate-x-4'
                : ''}"
            ></span>
          </span>
          <span
            class="min-w-[4.5rem] text-left text-sm font-medium {published
              ? 'text-green-800'
              : 'text-gray-600'}"
          >
            {published ? "Publiée" : "Brouillon"}
          </span>
        </button>
      </div>
    </div>

    <div class="fr-input-group flex min-h-0 flex-1 flex-col fr-mb-0">
      <span class="fr-label fr-mb-1w shrink-0">Contenu</span>
      <RichTextEditor bind:html={contenu} toolbarEnd={saveStatus} />
    </div>
  </div>

  {#snippet publishBlockedFooter()}
    <button type="button" class="fr-btn ml-auto" onclick={() => (publishBlockedOpen = false)}>
      Compris
    </button>
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

  {#if publishBlockedOpen}
    <Modal
      title="Publication impossible pour le moment"
      onClose={() => (publishBlockedOpen = false)}
      footer={publishBlockedFooter}
    >
      <div class="fr-p-3w">
        <p class="fr-mb-2w">
          Pour publier cette entrée sur la page « Nouveautés », il faut d'abord&nbsp;:
        </p>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {@render requirement("Un titre", titre.trim() !== "")}
          {@render requirement("Une version complète (X.Y.Z)", versionComplete)}
        </ul>
        <p class="fr-mb-0 fr-mt-2w text-sm text-gray-600">
          L'entrée reste enregistrée en brouillon en attendant.
        </p>
      </div>
    </Modal>
  {/if}
{/if}
