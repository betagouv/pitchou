<script lang="ts">
  import type { CommentExplanation } from "@pitchou/types/onagreCommentEvidence.ts";
  let { explanations }: { explanations: CommentExplanation[] } = $props();
  let expanded = $state(false);
  const visible = $derived(expanded ? explanations : explanations.slice(0, 1));
</script>

<div class="explanations">
  {#each visible as explanation}
    <section aria-label="Motif de revue de la demande">
      <p class="species">{explanation.species.join(" · ")}</p>
      <ul class="facts">
        {#each explanation.facts as fact}<li>{fact}</li>{/each}
      </ul>
      <p class="reason-label">Pourquoi examiner cette information ?</p>
      {#each explanation.reasons as reason}<p>{reason}</p>{/each}
      <p><strong>À décider :</strong> {explanation.decision}</p>
    </section>
  {:else}
    <p>
      Le détail source de cette demande n’est pas disponible pour cet inventaire. Il doit être
      chargé avant de pouvoir expliquer ce cas.
    </p>
  {/each}
  {#if explanations.length > 1}
    <button
      class="fr-btn fr-btn--secondary fr-btn--sm"
      aria-expanded={expanded}
      onclick={() => (expanded = !expanded)}
    >
      {expanded
        ? "Réduire les situations"
        : `Voir les ${explanations.length - 1} autres situations de cette demande`}
    </button>
  {/if}
</div>

<style>
  .explanations {
    margin-top: 0.5rem;
  }
  section {
    border-left: 3px solid var(--border-default-grey);
    padding: 0.25rem 1rem;
    margin-bottom: 1rem;
  }
  p,
  ul {
    margin: 0 0 0.5rem;
  }
  .species,
  .reason-label {
    font-weight: 600;
  }
  .facts {
    padding-left: 1.2rem;
    color: var(--text-mention-grey);
  }
  button {
    margin-bottom: 0.5rem;
  }
</style>
