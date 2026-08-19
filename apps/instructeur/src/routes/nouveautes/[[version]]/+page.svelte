<script lang="ts">
  import { onMount } from "svelte";
  import { format, parseISO } from "date-fns";
  import { fr } from "date-fns/locale";

  import Loader from "@pitchou/ui/Loader.svelte";
  import {
    loadPublishedChangelogEntries,
    type PublishedChangelogEntry,
  } from "$lib/changelog/changelog.ts";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let entries = $state<PublishedChangelogEntry[] | undefined>(undefined);
  let loadError = $state<string | null>(null);

  onMount(async () => {
    try {
      entries = await loadPublishedChangelogEntries();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  });

  // Entries come sorted most recent first; no version in the URL means the latest.
  const entry = $derived(
    entries === undefined
      ? undefined
      : data.version
        ? (entries.find((candidate) => candidate.version === data.version) ?? null)
        : (entries[0] ?? null),
  );
  const index = $derived(entry && entries ? entries.indexOf(entry) : -1);
  // Chronological navigation: « précédente » is the older entry, further down the list.
  const older = $derived(entries !== undefined && index >= 0 ? entries[index + 1] : undefined);
  const newer = $derived(entries !== undefined && index > 0 ? entries[index - 1] : undefined);

  function formatDate(date: string): string {
    return format(parseISO(date), "d MMMM yyyy", { locale: fr });
  }
</script>

<svelte:head>
  <title>Nouveautés — Pitchou</title>
</svelte:head>

<!-- Same fr-container width as the header and footer. -->
<div class="fr-container fr-my-6w">
  {#if loadError}
    <div class="fr-alert fr-alert--error" role="alert">
      <h3 class="fr-alert__title">Erreur lors du chargement des nouveautés</h3>
      <p>{loadError}</p>
    </div>
  {:else if entries === undefined}
    <Loader />
  {:else if entries.length === 0}
    <h1>Nouveautés</h1>
    <p>Aucune nouveauté publiée pour le moment.</p>
  {:else if entry === null}
    <h1>Version introuvable</h1>
    <p>Aucune version publiée ne correspond à cette adresse.</p>
    <a class="fr-link" href="/nouveautes">Voir la dernière version</a>
  {:else if entry}
    <!-- Left goes to the newer version, right goes back in time; a greyed-out
         button (instead of nothing) shows when an end of the list is reached. -->
    <nav aria-label="Navigation entre les versions" class="flex items-center justify-between gap-2">
      {#if newer}
        <a
          class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
          href={`/nouveautes/${newer.version}`}
          title={`Version suivante (${newer.version})`}
        >
          Version suivante
        </a>
      {:else}
        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
          disabled
        >
          Version suivante
        </button>
      {/if}

      <p class="fr-text--sm fr-text-mention--grey fr-mb-0 text-center">
        Version {entry.version} · {formatDate(entry.date)}
      </p>

      {#if older}
        <a
          class="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-arrow-right-line"
          href={`/nouveautes/${older.version}`}
          title={`Version précédente (${older.version})`}
        >
          Version précédente
        </a>
      {:else}
        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--icon-right fr-icon-arrow-right-line"
          disabled
        >
          Version précédente
        </button>
      {/if}
    </nav>

    <h1 class="fr-mt-3w fr-mb-0">{entry.titre}</h1>

    <!-- Safe: `contenu` is sanitized server-side at write time. -->
    <div
      class="fr-content fr-mt-4w [&_img]:max-w-full [&_img]:rounded-md [&_video]:max-w-full [&_video]:rounded-md [&_img]:block [&_video]:block [&_img[data-align=center]]:mx-auto [&_img[data-align=right]]:ml-auto [&_video[data-align=center]]:mx-auto [&_video[data-align=right]]:ml-auto [&_blockquote]:border-l-4 [&_blockquote]:border-solid [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm"
    >
      {@html entry.contenu}
    </div>
  {/if}
</div>
