<script lang="ts">
  import { can } from "$lib/access.svelte.ts";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";
  import EntryCard from "./EntryCard.svelte";
  import { loadChangelogAdmin, type ChangelogEntryAdmin } from "$lib/actions/adminChangelog.ts";
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

  $effect(() => {
    if (!can("admin:changelog:create")) return;
    pageHeader.setAction({
      label: "Nouvelle entrée",
      onClick: () => void goto("/changelog/nouveau"),
    });
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
    <section class="admin-panel" aria-labelledby="entries-title">
      <h2 id="entries-title">
        Notes de version <span
          class="ml-2 rounded bg-[var(--background-contrast-grey)] px-2 py-0.5 text-xs font-normal text-[var(--text-mention-grey)]"
          >{entries.length}</span
        >
      </h2>
      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        {#each entries as entry (entry.id)}
          <EntryCard {entry} />
        {/each}
      </ul>
    </section>
  {/if}
{/if}
