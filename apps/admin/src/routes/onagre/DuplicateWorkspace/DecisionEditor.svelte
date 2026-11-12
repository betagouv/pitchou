<script lang="ts">
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate } from "$app/navigation";
  import {
    duplicateDecisionLabels,
    type DuplicateOutcome,
    type DuplicateReview,
    type DuplicateDemande,
    type DuplicateDecision,
    type DuplicateRevision,
  } from "@pitchou/types/onagreDuplicates.ts";
  let {
    project,
    demande,
    decision,
    revisions,
    writable,
  }: {
    project: DuplicateReview;
    demande: DuplicateDemande;
    decision?: DuplicateDecision;
    revisions: DuplicateRevision[];
    writable: boolean;
  } = $props();
  let outcome = $state<DuplicateOutcome>(untrack(() => decision?.outcome ?? "pending"));
  let reason = $state(untrack(() => decision?.reason ?? ""));
  let busy = $state(false);
  let error = $state("");
  let dirty = $derived(
    outcome !== (decision?.outcome ?? "pending") || reason !== (decision?.reason ?? ""),
  );
  beforeNavigate(({ cancel }) => {
    if (dirty && !busy && !window.confirm("Quitter sans enregistrer cette décision ?")) cancel();
  });
</script>

<p><strong>État enregistré : {duplicateDecisionLabels[decision?.outcome ?? "pending"]}</strong></p>
{#if writable}
  <form
    data-duplicate-dirty={dirty}
    method="POST"
    action="?/saveDuplicate&tab=doublons"
    use:enhance={() => {
      busy = true;
      error = "";
      return async ({ result, update }) => {
        try {
          if (result.type === "success") await update({ reset: false });
          else
            error =
              result.type === "failure"
                ? String(result.data?.message ?? "Enregistrement impossible.")
                : "Enregistrement impossible. Rechargez la page avant de réessayer.";
        } finally {
          busy = false;
        }
      };
    }}
  >
    <input type="hidden" name="project_id" value={project.project_id} />
    <input type="hidden" name="demande_key" value={demande.key} />
    <input type="hidden" name="review_hash" value={project.review_hash} />
    <input type="hidden" name="version" value={decision?.version ?? 0} />
    <fieldset disabled={busy}>
      <label
        >Choix pour cette demande
        <select name="outcome" class="fr-select" bind:value={outcome}>
          {#each Object.entries(duplicateDecisionLabels) as [value, label]}<option {value}
              >{label}</option
            >{/each}
        </select>
      </label>
      {#if outcome === "import_new"}<p>
          Ce choix autorise la préparation d’une nouvelle demande malgré le rapprochement signalé.
          Vérifiez qu’elle n’est pas déjà couverte par un dossier DN.
        </p>{/if}
      {#if outcome === "ignore"}<p>
          Cette demande sera à exclure de la reprise. Aucun dossier existant n’est supprimé ou
          fusionné.
        </p>{/if}
      <label
        >Justification et références vérifiées {outcome !== "pending"
          ? "(obligatoire)"
          : "(facultatif)"}
        <textarea
          class="fr-input"
          name="reason"
          rows="3"
          maxlength="10000"
          required={outcome !== "pending"}
          bind:value={reason}></textarea>
      </label>
      {#if error}<p role="alert" class="fr-alert fr-alert--error">{error}</p>{/if}
      <button type="submit" class="fr-btn fr-btn--sm" disabled={!dirty}
        >{busy ? "Enregistrement…" : "Enregistrer la décision"}</button
      >
    </fieldset>
  </form>
{:else}
  <p>{decision?.reason || "Aucune décision enregistrée."}</p>
  <p>Le droit de gestion de la migration est nécessaire pour enregistrer une décision.</p>
{/if}
{#if revisions.length}
  <details>
    <summary>Historique des décisions ({revisions.length})</summary>
    {#each revisions as revision (revision.id)}
      <p>
        <strong>{duplicateDecisionLabels[revision.after.outcome]}</strong> · {new Date(
          revision.created_at,
        ).toLocaleString("fr-FR")} · Compte #{revision.actor_id} · Version {revision.after
          .version}<br />{revision.after.reason || "Remise à examiner."}
      </p>
    {/each}
  </details>
{/if}

<style>
  fieldset {
    border: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }
  button {
    justify-self: start;
  }
  details {
    margin-top: 1rem;
  }
</style>
