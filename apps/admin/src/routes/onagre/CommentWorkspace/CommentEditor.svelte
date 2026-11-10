<script lang="ts">
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { beforeNavigate, goto } from "$app/navigation";
  import {
    commentOutcomes,
    type CommentChoice,
    type CommentDecision,
    type CommentGroup,
    type CommentOutcome,
  } from "@pitchou/types/onagreComments.ts";
  import WorkspaceDialog from "../WorkspaceDialog.svelte";
  import SourceExamples from "./SourceExamples.svelte";
  import "./editor.css";
  let {
    group,
    choices,
    writable,
    onClose,
  }: {
    group: CommentGroup & { decision: CommentDecision | null };
    choices: CommentChoice[];
    writable: boolean;
    onClose: () => void;
  } = $props();
  let values = $state(
    untrack(() => ({
      outcome: group.decision?.outcome ?? ("pending" as CommentOutcome),
      selection: group.decision?.target
        ? [group.decision.target, group.decision.classification, group.decision.code].join("|")
        : "",
      reason: group.decision?.reason ?? "",
    })),
  );
  const initial = untrack(() => JSON.stringify(values));
  const dirty = $derived(JSON.stringify(values) !== initial);
  const selected = $derived(
    choices.find((c) => [c.target, c.classification, c.code].join("|") === values.selection),
  );
  const allowed = $derived(
    choices.filter(
      (c) =>
        !group.payload.context.classifications?.length ||
        group.payload.context.classifications.includes(c.classification),
    ),
  );
  const targetLabels = {
    impact_type: "Type d’impact",
    impact_methode: "Méthode",
    impact_moyen_de_poursuite: "Moyen de poursuite",
  };
  let busy = $state(false),
    error = $state("");
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
</script>

<WorkspaceDialog title="Examiner une formulation Onagre" {busy} onClose={close}>
  <div class="admin-stack comment-editor-content">
    <SourceExamples {group} />
    <h3>Proposition de l’équipe</h3>
    <p>La proposition prépare une règle de reprise. Elle ne modifie aucun dossier.</p>
    <form
      id="comment-decision"
      method="POST"
      action={`?/saveComment&${page.url.searchParams}`}
      class="admin-stack"
      use:enhance={({ cancel }) => {
        if (busy || !writable) {
          cancel();
          return;
        }
        busy = true;
        error = "";
        return async ({ result, update }) => {
          try {
            if (result.type === "success") {
              bypass = true;
              await update({ reset: false });
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
      <input type="hidden" name="group_id" value={group.id} />
      <input type="hidden" name="review_hash" value={group.review_hash} />
      <input type="hidden" name="version" value={group.decision?.version ?? 0} />
      <input type="hidden" name="target" value={selected?.target ?? ""} />
      <input type="hidden" name="classification" value={selected?.classification ?? ""} />
      <input type="hidden" name="code" value={selected?.code ?? ""} />
      <fieldset disabled={busy || !writable} class="admin-stack">
        <legend class="fr-sr-only">Correspondance proposée</legend>
        <label
          ><span id="comment-outcome-label">Décision</span>
          <select
            aria-labelledby="comment-outcome-label"
            class="fr-select"
            name="outcome"
            bind:value={values.outcome}
          >
            {#each Object.entries(commentOutcomes) as [key, label]}
              {#if key !== "proposed" || group.category !== "unresolved_species"}<option value={key}
                  >{label}</option
                >{/if}
            {/each}
          </select>
        </label>
        {#if values.outcome === "proposed"}
          <label
            ><span id="comment-target-label">Destination dans Pitchou</span>
            <select
              aria-labelledby="comment-target-label"
              class="fr-select"
              bind:value={values.selection}
              required
            >
              <option value="">Choisir une destination</option>
              {#each Object.entries(targetLabels) as [target, label]}
                <optgroup {label}
                  >{#each allowed.filter((c) => c.target === target) as choice}<option
                      value={[choice.target, choice.classification, choice.code].join("|")}
                      >{choice.classification} · {choice.label} ({choice.code})</option
                    >{/each}</optgroup
                >
              {/each}
            </select>
          </label>
        {/if}
        <label
          >Justification, conditions et exceptions
          <textarea
            class="fr-input"
            name="reason"
            rows="5"
            maxlength="10000"
            required={values.outcome !== "pending"}
            bind:value={values.reason}></textarea>
        </label>
      </fieldset>
      {#if error}<p role="alert" class="fr-alert fr-alert--error">{error}</p>{/if}
      {#if group.decision}<p>
          Dernière proposition enregistrée le {new Date(group.decision.updated_at).toLocaleString(
            "fr-FR",
          )}.
        </p>{/if}
    </form>
  </div>
  {#snippet footer()}
    <div class="comment-editor-buttons">
      {#if pending}
        <p role="alert">Votre proposition n’est pas enregistrée.</p>
        <button class="fr-btn fr-btn--secondary" onclick={() => (pending = null)}
          >Continuer la saisie</button
        >
        <button
          class="fr-btn"
          onclick={() => {
            bypass = true;
            pending?.();
          }}>Abandonner les modifications</button
        >
      {:else}
        <button class="fr-btn fr-btn--secondary" disabled={busy} onclick={close}>Fermer</button>
        {#if writable}<button
            class="fr-btn"
            type="submit"
            form="comment-decision"
            disabled={busy || !dirty}
            >{busy ? "Enregistrement…" : "Enregistrer la proposition"}</button
          >{/if}
      {/if}
    </div>
  {/snippet}
</WorkspaceDialog>
