<script lang="ts">
  import { untrack, tick } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  import DecisionFields from "./MappingEditor/DecisionFields.svelte";
  import SourceContext from "./MappingEditor/SourceContext.svelte";
  import { DecisionDraft } from "./MappingEditor/decision.svelte.ts";
  import { mappingLink, type Target } from "./mappings.ts";
  let {
    mapping,
    targets,
    writable,
    table,
    previous,
    next,
    position,
    onSelect,
    onClose,
    onSaved,
  }: {
    mapping: OnagreMapping;
    targets: Target[];
    writable: boolean;
    table?: OnagreTable;
    previous?: string;
    next?: string;
    position: string;
    onSelect: (key: string) => void;
    onClose: () => void;
    onSaved: (next?: string) => void;
  } = $props();
  const draft = new DecisionDraft(untrack(() => mapping));
  let pending = $state<(() => void) | null>(null);
  let bypass = false;
  let url = $derived(page.shallow?.url ?? page.url);
  function request(action: () => void) {
    if (draft.busy) return false;
    if (draft.dirty) pending = action;
    else action();
    return false;
  }
  function discard() {
    const action = pending;
    pending = null;
    bypass = true;
    action?.();
  }
  beforeNavigate((navigation) => {
    if (bypass || (!draft.dirty && !draft.busy)) return;
    navigation.cancel();
    if (!navigation.willUnload && navigation.to && !draft.busy) {
      const href = navigation.to.url.href;
      pending = () => void goto(href);
    }
  });
  $effect(() => {
    if (pending) document.querySelector<HTMLButtonElement>("#mapping-keep-editing")?.focus();
  });
</script>

<WorkspaceDialog
  title="Décider une correspondance"
  size="xlarge"
  busy={draft.busy}
  onClose={() => request(onClose)}
  triggerSelector={`[data-mapping-key="${mapping.key}"]`}
>
  {#snippet footer()}
    <div class="mapping-editor-footer">
      {#if pending}
        <p role="alert">Vos modifications ne sont pas enregistrées.</p>
        <div>
          <button
            id="mapping-keep-editing"
            type="button"
            class="fr-btn fr-btn--secondary"
            onclick={() => (pending = null)}>Continuer la saisie</button
          ><button type="button" class="fr-btn" onclick={discard}
            >Abandonner les modifications</button
          >
        </div>
      {:else}
        <span class="mapping-save-state" role="status"
          >{!writable
            ? "Consultation seule"
            : draft.busy
              ? "Enregistrement…"
              : draft.dirty
                ? "Modifications non enregistrées"
                : "Aucune modification en attente"}</span
        >
        <div>
          {#if writable}<button
              class="fr-btn fr-btn--secondary"
              type="submit"
              form="mapping-decision-form"
              disabled={draft.busy || !draft.dirty}>Enregistrer</button
            ><button
              class="fr-btn"
              type="submit"
              form="mapping-decision-form"
              name="advance"
              value="yes"
              disabled={draft.busy || !next}>Enregistrer et continuer</button
            >{:else}<button class="fr-btn fr-btn--secondary" type="button" onclick={onClose}
              >Fermer</button
            >{/if}
        </div>
      {/if}
    </div>
  {/snippet}
  <nav class="mapping-editor-navigation" aria-label="Parcourir les correspondances">
    <span>{position} <span class="onagre-context">dans la sélection</span></span>
    <div>
      <button
        type="button"
        disabled={!previous || draft.busy}
        onclick={() => previous && request(() => onSelect(previous!))}>Précédente</button
      ><button
        type="button"
        disabled={!next || draft.busy}
        onclick={() => next && request(() => onSelect(next!))}>Suivante</button
      >
    </div>
  </nav>
  <div class="mapping-editor-layout">
    <SourceContext {mapping} {table} />
    <form
      id="mapping-decision-form"
      method="POST"
      action={`?/save&${mappingLink(url, {}).slice(1)}`}
      class="mapping-decision"
      use:enhance={({ cancel, submitter }) => {
        if (!writable || draft.busy) {
          cancel();
          return;
        }
        const invalid = draft.validate();
        if (invalid) {
          cancel();
          document.querySelector<HTMLElement>(`#${invalid}`)?.focus();
          return;
        }
        const nextKey = submitter?.getAttribute("name") === "advance" ? next : undefined;
        draft.busy = true;
        return async ({ result, update }) => {
          try {
            if (result.type === "success") {
              draft.markSaved();
              await update({ reset: false });
              onSaved(nextKey);
            } else {
              draft.error =
                result.type === "failure"
                  ? String(result.data?.message ?? "Enregistrement impossible.")
                  : "Enregistrement impossible. Vos modifications sont conservées, réessayez.";
              await tick();
              document.querySelector<HTMLElement>("#mapping-save-error")?.focus();
            }
          } finally {
            draft.busy = false;
          }
        };
      }}
    >
      <input type="hidden" name="key" value={mapping.key} /><input
        type="hidden"
        name="version"
        value={mapping.version}
      />
      {#if draft.error}<p id="mapping-save-error" class="mapping-error" role="alert" tabindex="-1">
          {draft.error}
        </p>{/if}
      <DecisionFields {draft} {targets} {writable} proposal={mapping.proposal} />
      <p class="mapping-version">
        Version {mapping.version}{mapping.updated_at
          ? ` · Modifiée le ${new Date(mapping.updated_at).toLocaleDateString("fr-FR")}`
          : " · Aucune décision enregistrée"}
      </p>
    </form>
  </div>
</WorkspaceDialog>
