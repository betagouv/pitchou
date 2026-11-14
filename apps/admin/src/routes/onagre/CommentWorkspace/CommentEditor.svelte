<script lang="ts">
  import DecisionFields from "./DecisionFields.svelte";
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { beforeNavigate, goto } from "$app/navigation";
  import {
    type CommentChoice,
    type CommentDecision,
    type CommentGroup,
    type CommentOutcome,
  } from "@pitchou/types/onagreComments.ts";
  import WorkspaceDialog from "../WorkspaceDialog.svelte";
  import SourceContext from "./SourceContext.svelte";
  import RelatedDemandes from "./RelatedDemandes.svelte";
  import ReviewTabs from "./ReviewTabs.svelte";
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
  let busy = $state(false),
    error = $state("");
  let pending = $state<(() => void) | null>(null);
  let bypass = false;
  let tab = $state("formulation");
  let demandesVisited = $state(false);
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

<WorkspaceDialog title="Examiner une formulation Onagre" size="xlarge" {busy} onClose={close}>
  <div class="admin-stack comment-editor-content">
    <ReviewTabs
      bind:tab
      count={group.demande_count}
      onChange={() => {
        if (tab === "demandes") demandesVisited = true;
      }}
    />
    <div
      id="comment-panel-formulation"
      role="tabpanel"
      aria-labelledby="comment-tab-formulation"
      hidden={tab !== "formulation"}
    >
      <SourceContext {group} />
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
        <DecisionFields {group} {choices} {busy} {writable} bind:values />
        {#if error}<p role="alert" class="fr-alert fr-alert--error">{error}</p>{/if}
        {#if group.decision}<p>
            Dernière proposition enregistrée le {new Date(group.decision.updated_at).toLocaleString(
              "fr-FR",
            )}.
          </p>{/if}
      </form>
    </div>
    <div
      id="comment-panel-demandes"
      role="tabpanel"
      aria-labelledby="comment-tab-demandes"
      hidden={tab !== "demandes"}
    >
      {#if demandesVisited}<RelatedDemandes groupId={group.id} />{/if}
    </div>
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
        {#if writable && tab === "formulation"}<button
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
