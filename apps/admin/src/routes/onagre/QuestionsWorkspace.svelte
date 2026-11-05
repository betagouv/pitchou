<script lang="ts">
  import {
    questionStatusLabels,
    type OnagreQuestion,
    type OnagreQuestionStatus,
  } from "@pitchou/types/onagreQuestions.ts";
  import QuestionEditor from "./QuestionEditor.svelte";
  let { questions, writable }: { questions: OnagreQuestion[]; writable: boolean } = $props();
  let selected = $state<OnagreQuestion | null | undefined>(undefined);
  let filter = $state<OnagreQuestionStatus | "all">("all");
  const visible = $derived(
    questions.filter((question) => filter === "all" || question.status === filter),
  );
</script>

<section class="admin-stack" aria-label="Questions à l’équipe">
  <div class="toolbar">
    <div class="filters" role="group" aria-label="Filtrer les questions">
      <button
        type="button"
        class="fr-btn fr-btn--secondary"
        aria-pressed={filter === "all"}
        onclick={() => (filter = "all")}>Toutes ({questions.length})</button
      >
      {#each Object.entries(questionStatusLabels) as [status, label]}
        <button
          type="button"
          class="fr-btn fr-btn--secondary"
          aria-pressed={filter === status}
          onclick={() => (filter = status as OnagreQuestionStatus)}
          >{label} ({questions.filter((q) => q.status === status).length})</button
        >
      {/each}
    </div>
    {#if writable}<button type="button" class="fr-btn" onclick={() => (selected = null)}
        >Ajouter une question</button
      >{/if}
  </div>
  {#each visible as question (question.id)}
    <article class="admin-panel question">
      <header>
        <div>
          <span class="status" data-status={question.status}
            >{questionStatusLabels[question.status]}</span
          >
          <h3>{question.title}</h3>
        </div>
        {#if writable}<button
            type="button"
            class="fr-btn fr-btn--secondary"
            onclick={() => (selected = question)}>Modifier</button
          >{/if}
      </header>
      <div class="details">
        {#each [["Contexte et sens des données", question.context], ["Exemples concernés", question.examples], ["Destinations possibles dans Pitchou", question.options], ["Réponse de l’équipe", question.answer]] as [label, value]}
          {#if value}<div>
              <h4>{label}</h4>
              <p>{value}</p>
            </div>{/if}
        {/each}
      </div>
      <p class="onagre-context">
        Mis à jour le {new Date(question.updated_at).toLocaleDateString("fr-FR")}
      </p>
    </article>
  {:else}
    <p class="admin-panel">
      {questions.length === 0
        ? "Aucune question pour le moment. Ajoutez le premier point à discuter avec l’équipe."
        : "Aucune question dans cette catégorie."}
    </p>
  {/each}
</section>
{#if selected !== undefined}
  <QuestionEditor question={selected} onClose={() => (selected = undefined)} />
{/if}

<style>
  .toolbar,
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .toolbar {
    flex-wrap: wrap;
  }
  .toolbar > button,
  header button {
    flex-shrink: 0;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .filters [aria-pressed="true"] {
    background: var(--background-action-low-blue-france);
  }
  .status {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    margin-bottom: 0.5rem;
    border-radius: 0.3rem;
    background: var(--background-contrast-info);
    color: var(--text-default-info);
    font-size: 0.875rem;
  }
  .status[data-status="answered"] {
    background: var(--background-contrast-success);
    color: var(--text-default-success);
  }
  .status[data-status="deferred"] {
    background: var(--background-alt-grey);
    color: var(--text-mention-grey);
  }
  h3 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }
  h4 {
    font-size: 1rem;
    margin: 0 0 0.5rem;
  }
  .details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .details p {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  @media (max-width: 800px) {
    .toolbar,
    header {
      flex-direction: column;
    }
    .details {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
