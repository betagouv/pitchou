<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";
  import EntryCard from "./EntryCard.svelte";
  import {
    loadChangelogAdmin,
    createChangelogEntry,
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
    <div
      class="mt-2 rounded-lg border border-dashed border-[color:var(--border-default-grey)] p-8 text-center text-[color:var(--text-mention-grey)]"
    >
      <p class="fr-mb-1v font-medium">Aucune entrée pour le moment</p>
      <p class="fr-mb-0 text-sm">
        Créez la première entrée avec le bouton «&nbsp;+&nbsp;» en haut de page.
      </p>
    </div>
  {:else}
    <ul class="mt-2 flex list-none flex-col gap-2 p-0">
      {#each entries as entry (entry.id)}
        <EntryCard {entry} />
      {/each}
    </ul>
  {/if}
{/if}
