<script lang="ts">
  import { onDestroy, tick, untrack } from "svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  import {
    GROUP_PREVIEW_PAGE_SIZE,
    type GroupPreview,
    type GroupPreviewPage,
    type PreviewCategory,
  } from "@pitchou/types/groupRouting.ts";

  let {
    category,
    label,
    result,
    token,
    input,
    stale,
    onStale,
  }: {
    category: PreviewCategory;
    label: string;
    result: GroupPreview[PreviewCategory];
    token: string;
    input: string;
    stale: boolean;
    onStale: () => void;
  } = $props();
  let dossiers = $state(untrack(() => result.dossiers));
  let current = $state(1);
  let loading = $state(false);
  let message = $state("");
  let request: AbortController | undefined;
  let range: HTMLParagraphElement;
  const total = $derived(Math.ceil(result.count / GROUP_PREVIEW_PAGE_SIZE));
  onDestroy(() => request?.abort());

  async function loadPage(page: number) {
    if (loading || stale || page === current) return;
    request = new AbortController();
    const signal = request.signal;
    loading = true;
    message = "";
    try {
      const query = new URLSearchParams({ category, page: String(page), token });
      const response = await fetch(`/api/groupes-instructeurs/apercu?${query}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: input,
        signal,
      });
      const body = await response.json();
      if (signal.aborted) return;
      if (response.status === 409) onStale();
      if (!response.ok) throw new Error(body.message ?? "Chargement impossible. Réessayez.");
      const pageResult = body as GroupPreviewPage;
      if (pageResult.token !== token) {
        onStale();
        throw new Error("L'aperçu n'est plus à jour. Vérifiez les affectations à nouveau.");
      }
      dossiers = pageResult.dossiers;
      current = pageResult.page;
      await tick();
      range?.focus({ preventScroll: true });
      range?.scrollIntoView({ block: "nearest" });
    } catch (cause) {
      if (!signal.aborted)
        message = cause instanceof Error ? cause.message : "Chargement impossible. Réessayez.";
    } finally {
      if (!signal.aborted) loading = false;
    }
  }
</script>

<details>
  <summary>{label} · {result.count.toLocaleString("fr-FR")}</summary>
  <div aria-busy={loading}>
    <p class="range" tabindex="-1" bind:this={range}>
      Dossiers {((current - 1) * GROUP_PREVIEW_PAGE_SIZE + 1).toLocaleString("fr-FR")}
      à {Math.min(current * GROUP_PREVIEW_PAGE_SIZE, result.count).toLocaleString("fr-FR")}
      sur {result.count.toLocaleString("fr-FR")}
    </p>
    <ul>
      {#each dossiers as dossier (dossier.id)}
        <li>
          <a href={`/dossiers/${dossier.id}`} target="_blank" rel="noreferrer">
            {dossier.name || "Dossier sans nom"} · #{dossier.id}<span class="sr-only"
              >, nouvel onglet</span
            >
          </a>
        </li>
      {/each}
    </ul>
  </div>
  {#if total > 1}
    <fieldset disabled={loading || stale}>
      <legend class="sr-only">Pages des {label.toLowerCase()}</legend>
      <Pagination {current} {total} label={`Pagination : ${label}`} onChange={loadPage} />
    </fieldset>
  {/if}
  {#if loading}<p role="status">Chargement des dossiers…</p>{/if}
  {#if message}<p role="alert" class="fr-error-text">{message}</p>{/if}
</details>

<style>
  details {
    border-top: 1px solid var(--border-default-grey);
  }
  summary {
    padding: 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .range {
    margin: 0 0 0.5rem;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
  }
  li {
    margin: 0.5rem 0;
    overflow-wrap: anywhere;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 1rem;
    min-width: 0;
  }
</style>
