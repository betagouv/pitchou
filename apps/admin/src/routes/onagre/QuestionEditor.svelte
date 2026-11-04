<script lang="ts">
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate, goto } from "$app/navigation";
  import {
    questionStatusLabels,
    type OnagreQuestion,
    type OnagreQuestionStatus,
  } from "@pitchou/types/onagreQuestions.ts";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  let { question, onClose }: { question: OnagreQuestion | null; onClose: () => void } = $props();
  let values = $state(
    untrack(() => ({
      title: question?.title ?? "",
      context: question?.context ?? "",
      examples: question?.examples ?? "",
      options: question?.options ?? "",
      answer: question?.answer ?? "",
      status: question?.status ?? "open",
    })),
  );
  const initial = untrack(() => JSON.stringify(values));
  const dirty = $derived(JSON.stringify(values) !== initial);
  let busy = $state(false);
  let error = $state("");
  let pending = $state<(() => void) | null>(null);
  let bypass = false;
  function close() {
    if (busy) return false;
    if (dirty) {
      pending = onClose;
      return false;
    }
    onClose();
  }
  beforeNavigate((navigation) => {
    if (bypass || (!dirty && !busy)) return;
    navigation.cancel();
    if (!navigation.willUnload && navigation.to && !busy) {
      const href = navigation.to.url.href;
      pending = () => void goto(href);
    }
  });
  const fields = [
    ["context", "Contexte et sens des données"],
    ["examples", "Exemples concernés"],
    ["options", "Destinations possibles dans Pitchou"],
    ["answer", "Réponse de l’équipe"],
  ] as const;
</script>

<WorkspaceDialog
  title={question ? "Modifier la question" : "Ajouter une question"}
  {busy}
  onClose={close}
>
  <form
    id="onagre-question-form"
    method="POST"
    action="?/saveQuestion&tab=questions"
    class="admin-stack"
    use:enhance={({ cancel }) => {
      if (busy) {
        cancel();
        return;
      }
      busy = true;
      error = "";
      return async ({ result, update }) => {
        try {
          if (result.type === "success") {
            await update({ reset: false });
            bypass = true;
            onClose();
          } else
            error =
              result.type === "failure"
                ? String(result.data?.message ?? "Enregistrement impossible.")
                : "Enregistrement impossible. Votre saisie est conservée.";
        } finally {
          busy = false;
        }
      };
    }}
  >
    <input type="hidden" name="id" value={question?.id ?? ""} />
    <input type="hidden" name="version" value={question?.version ?? 0} />
    <input type="hidden" name="status" value={values.status} />
    <fieldset disabled={busy} class="admin-stack">
      <legend class="fr-sr-only">Détails de la question</legend>
      <label for="question-title">Question à trancher</label>
      <input
        id="question-title"
        class="fr-input"
        name="title"
        maxlength="200"
        required
        bind:value={values.title}
      />
      {#each fields as [key, label]}
        <div>
          <label for={`question-${key}`}
            >{label}{key !== "answer" || values.status !== "answered" ? " (facultatif)" : ""}</label
          >
          <textarea
            id={`question-${key}`}
            class="fr-input"
            name={key}
            rows="4"
            maxlength="20000"
            required={key === "answer" && values.status === "answered"}
            bind:value={values[key]}></textarea>
        </div>
      {/each}
      <div class="statuses" role="group" aria-label="Avancement de la question">
        {#each Object.entries(questionStatusLabels) as [status, label]}
          <button
            type="button"
            class="fr-btn fr-btn--secondary"
            aria-pressed={values.status === status}
            onclick={() => (values.status = status as OnagreQuestionStatus)}>{label}</button
          >
        {/each}
      </div>
    </fieldset>
    {#if error}<p role="alert">{error}</p>{/if}
  </form>
  {#snippet footer()}
    <div class="footer">
      {#if pending}
        <p role="alert">Vos modifications ne sont pas enregistrées.</p>
        <button type="button" class="fr-btn fr-btn--secondary" onclick={() => (pending = null)}
          >Continuer la saisie</button
        >
        <button
          type="button"
          class="fr-btn"
          onclick={() => {
            bypass = true;
            pending?.();
          }}>Abandonner les modifications</button
        >
      {:else}
        <button type="button" class="fr-btn fr-btn--secondary" disabled={busy} onclick={close}
          >Annuler</button
        >
        <button type="submit" form="onagre-question-form" class="fr-btn" disabled={busy || !dirty}
          >{busy ? "Enregistrement…" : "Enregistrer"}</button
        >
      {/if}
    </div>
  {/snippet}
</WorkspaceDialog>

<style>
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  .statuses,
  .footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  [aria-pressed="true"] {
    background: var(--background-action-low-blue-france);
  }
</style>
