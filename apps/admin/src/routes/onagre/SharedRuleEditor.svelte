<script lang="ts">
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { OnagreSharedRule } from "@pitchou/types/onagre.ts";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  import { statusLabels } from "./mappings.ts";
  let {
    rule,
    writable,
    onClose,
  }: { rule: OnagreSharedRule; writable: boolean; onClose: () => void } = $props();
  let text = $state(untrack(() => rule.rule));
  let notes = $state(untrack(() => rule.notes));
  let status = $state(untrack(() => rule.status));
  let version = $state(untrack(() => rule.version));
  let initial = $state(untrack(() => JSON.stringify([rule.rule, rule.notes, rule.status])));
  let dirty = $derived(JSON.stringify([text, notes, status]) !== initial);
  let busy = $state(false);
  let error = $state("");
  let saved = $state(false);
  let pending = $state<(() => void) | null>(null);
  let bypass = false;
  function close() {
    if (busy) return;
    if (dirty) pending = onClose;
    else onClose();
  }
  function discard() {
    bypass = true;
    pending?.();
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

<WorkspaceDialog
  title={rule.title}
  {busy}
  onClose={close}
  triggerSelector={`[data-rule-key="${rule.key}"]`}
>
  <form
    id="shared-rule-form"
    method="POST"
    action="?/saveSharedRule&tab=regles"
    class="shared-rule-form admin-stack"
    use:enhance={({ cancel }) => {
      if (!writable || busy) {
        cancel();
        return;
      }
      busy = true;
      error = "";
      saved = false;
      return async ({ result, update }) => {
        try {
          if (result.type === "success") {
            initial = JSON.stringify([text, notes, status]);
            version += 1;
            saved = true;
            await update({ reset: false });
          } else {
            error =
              result.type === "failure"
                ? String(result.data?.message ?? "Enregistrement impossible.")
                : "Enregistrement impossible. Vos modifications sont conservées.";
          }
        } finally {
          busy = false;
        }
      };
    }}
  >
    <p>Cette règle concerne toutes les correspondances auxquelles elle s'applique.</p>
    <input type="hidden" name="key" value={rule.key} />
    <input type="hidden" name="version" value={version} />
    <input type="hidden" name="status" value={status} />
    <fieldset disabled={!writable || busy} class="shared-rule-fields admin-stack">
      <legend class="fr-sr-only">Modifier la règle commune</legend>
      <div class="shared-rule-choices" role="group" aria-label="Avancement de la règle commune">
        {#each ["review", "discuss", "validated"] as value}
          <button
            type="button"
            aria-pressed={status === value}
            onclick={() => (status = value as OnagreSharedRule["status"])}
            >{statusLabels[value as OnagreSharedRule["status"]]}</button
          >
        {/each}
      </div>
      <label for="shared-rule-text">Règle proposée</label>
      <textarea
        id="shared-rule-text"
        class="fr-input"
        name="rule"
        rows="6"
        maxlength="20000"
        required
        bind:value={text}></textarea>
      <label for="shared-rule-notes"
        >Questions communes <span class="onagre-context">Facultatif</span></label
      >
      <textarea
        id="shared-rule-notes"
        class="fr-input"
        name="notes"
        rows="4"
        maxlength="20000"
        bind:value={notes}></textarea>
    </fieldset>
    {#if error}<p role="alert">{error}</p>{/if}
    <span class="onagre-context">Version {version}</span>
  </form>
  {#snippet footer()}
    <div class="shared-rule-footer">
      {#if pending}
        <p role="alert">Vos modifications ne sont pas enregistrées.</p>
        <button type="button" class="fr-btn fr-btn--secondary" onclick={() => (pending = null)}
          >Continuer la saisie</button
        >
        <button type="button" class="fr-btn" onclick={discard}>Abandonner les modifications</button>
      {:else}
        <span role="status"
          >{busy
            ? "Enregistrement…"
            : dirty
              ? "Modifications non enregistrées"
              : saved
                ? "Règle commune enregistrée."
                : "Aucune modification en attente"}</span
        >
        {#if writable}<button
            type="submit"
            form="shared-rule-form"
            class="fr-btn"
            disabled={busy || !dirty}>Enregistrer</button
          >{/if}
      {/if}
    </div>
  {/snippet}
</WorkspaceDialog>
