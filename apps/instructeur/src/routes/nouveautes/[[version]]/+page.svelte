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

<div class="fr-container fr-my-6w max-w-3xl">
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
    <nav
      aria-label="Navigation entre les versions"
      class="grid grid-cols-[3rem_1fr_3rem] items-start gap-2"
    >
      <div>
        {#if older}
          <a
            class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line"
            href={`/nouveautes/${older.version}`}
            title={`Version précédente (${older.version})`}
          >
            Version précédente
          </a>
        {/if}
      </div>
      <div class="text-center">
        <h1 class="fr-mb-1w">{entry.titre}</h1>
        <p class="fr-text--sm fr-mb-0">Version {entry.version} · {formatDate(entry.date)}</p>
      </div>
      <div class="text-right">
        {#if newer}
          <a
            class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-right-line"
            href={`/nouveautes/${newer.version}`}
            title={`Version suivante (${newer.version})`}
          >
            Version suivante
          </a>
        {/if}
      </div>
    </nav>

    <!-- Safe: `contenu` is sanitized server-side at write time. -->
    <div class="fr-content fr-mt-4w">
      {@html entry.contenu}
    </div>
  {/if}
</div>
