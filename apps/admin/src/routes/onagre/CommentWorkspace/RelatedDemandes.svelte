<script lang="ts">
  import Pagination from "#lib/components/Pagination.svelte";
  import DemandeExplanation from "./DemandeExplanation.svelte";
  import type { CommentDemandePage } from "@pitchou/types/onagreComments.ts";
  let { groupId }: { groupId: string } = $props();
  let current = $state(1);
  let result = $state<CommentDemandePage | null>(null);
  let loading = $state(false);
  let error = $state("");
  let retry = $state(0);
  $effect(() => {
    const controller = new AbortController();
    const url = `/api/onagre/comment-groups/${groupId}/demandes?page=${current}`;
    void retry;
    loading = true;
    error = "";
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Impossible de charger les demandes.");
        const data: CommentDemandePage = await response.json();
        if (!controller.signal.aborted) result = data;
      } catch (cause) {
        if (!controller.signal.aborted)
          error = cause instanceof Error ? cause.message : "Impossible de charger les demandes.";
      } finally {
        if (!controller.signal.aborted) loading = false;
      }
    })();
    return () => controller.abort();
  });
</script>

<div class="admin-stack" aria-busy={loading}>
  {#if loading}<p role="status">Chargement des demandes…</p>
  {:else if error}
    <p role="alert">{error}</p>
    <button class="fr-btn fr-btn--secondary" onclick={() => retry++}>Réessayer</button>
  {:else if result}
    <div class="page-controls">
      <p role="status">
        {result.total ? (result.page - 1) * result.pageSize + 1 : 0}–{Math.min(
          result.page * result.pageSize,
          result.total,
        )} sur {result.total.toLocaleString("fr-FR")} demandes
      </p>
      <Pagination
        current={result.page}
        total={Math.max(1, Math.ceil(result.total / result.pageSize))}
        label="Pagination des demandes concernées"
        onChange={(value) => (current = value)}
      />
    </div>
    <ul class="related-demandes">
      {#each result.items as item (item.key)}
        <li>
          <strong>{item.label}</strong>
          {#each item.dossiers as dossier (dossier.id)}
            <a href={dossier.url} target="_blank" rel="noopener noreferrer"
              >{dossier.name}<span class="fr-sr-only">
                — Ouvrir dans l’application instructeur, nouvel onglet</span
              ></a
            >
          {:else}<span class="unavailable">Non importée dans Pitchou</span>{/each}
          <DemandeExplanation explanations={item.explanations} />
        </li>
      {:else}<li>Aucune demande.</li>{/each}
    </ul>
  {/if}
</div>

<style>
  .page-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .related-demandes {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-default-grey);
    overflow-wrap: anywhere;
  }
  a {
    align-self: start;
  }
  .unavailable {
    color: var(--text-mention-grey);
  }
</style>
