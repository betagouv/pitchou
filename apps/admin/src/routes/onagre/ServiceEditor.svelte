<script lang="ts">
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { OnagreGroup, OnagreService } from "@pitchou/types/onagreServices.ts";
  import type { MappingStatus } from "@pitchou/types/onagre.ts";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  import ServiceSource from "./ServiceSource.svelte";
  import ServiceGroupPicker from "./ServiceGroupPicker.svelte";
  import { statusLabels } from "./mappings.ts";
  let {
    service,
    groups,
    catalogHash,
    snapshotId,
    writable,
    onClose,
    nextId,
    onNext,
  }: {
    service: OnagreService;
    groups: OnagreGroup[];
    catalogHash: string;
    snapshotId: number;
    writable: boolean;
    onClose: () => void;
    nextId: number | null;
    onNext: (id: number) => void;
  } = $props();
  let groupIds = $state(untrack(() => [...(service.mapping?.group_ids ?? [])]));
  let notes = $state(untrack(() => service.mapping?.notes ?? ""));
  let status = $state<MappingStatus>(untrack(() => service.mapping?.status ?? "todo"));
  let version = $state(untrack(() => service.mapping?.version ?? 0));
  let initial = $state(untrack(() => JSON.stringify([groupIds, notes, status])));
  let dirty = $derived(JSON.stringify([groupIds, notes, status]) !== initial);
  let busy = $state(false);
  let error = $state("");
  let saved = $state(false);
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
  title="Relier un service Onagre"
  size="xlarge"
  {busy}
  onClose={close}
  triggerSelector={`[data-service-id="${service.id}"]`}
>
  <form
    id="service-decision"
    method="POST"
    action={`?/saveService&tab=services&snapshot=${snapshotId}`}
    class="service-editor"
    use:enhance={({ cancel, submitter }) => {
      const next = submitter?.getAttribute("value") === "next" ? nextId : null;
      if (!writable || busy || service.absent) {
        cancel();
        return;
      }
      busy = true;
      error = "";
      saved = false;
      return async ({ result, update }) => {
        try {
          if (result.type === "success") {
            initial = JSON.stringify([groupIds, notes, status]);
            version++;
            saved = true;
            await update({ reset: false });
            if (next !== null) onNext(next);
          } else
            error =
              result.type === "failure"
                ? String(result.data?.message ?? "Enregistrement impossible.")
                : "Enregistrement impossible. Vos modifications sont conservées.";
        } finally {
          busy = false;
        }
      };
    }}
  >
    <ServiceSource {service} {snapshotId} />
    <div class="service-decision admin-stack">
      <h3>Décision pour Pitchou</h3>
      <input type="hidden" name="serviceId" value={service.id} /><input
        type="hidden"
        name="snapshotId"
        value={snapshotId}
      /><input type="hidden" name="version" value={version} /><input
        type="hidden"
        name="sourceHash"
        value={service.sourceHash}
      /><input type="hidden" name="catalogHash" value={catalogHash} /><input
        type="hidden"
        name="status"
        value={status}
      />
      <fieldset disabled={!writable || busy || service.absent}>
        <legend class="fr-sr-only">Correspondance du service</legend>
        <div class="service-status-choices" role="group" aria-label="Avancement">
          {#each Object.entries(statusLabels) as [value, label]}<button
              type="button"
              aria-pressed={status === value}
              onclick={() => (status = value as MappingStatus)}>{label}</button
            >{/each}
        </div>
        <ServiceGroupPicker
          {groups}
          bind:selected={groupIds}
          disabled={!writable || busy || service.absent}
        />
        {#if status === "excluded" && groupIds.length}<p role="alert">
            Retirez les groupes sélectionnés pour exclure ce service.
          </p>{/if}
        <label for="service-notes"
          >{status === "excluded" ? "Raison de l'exclusion" : "Notes et questions"}</label
        >
        <textarea
          id="service-notes"
          class="fr-input"
          name="notes"
          rows="3"
          maxlength="10000"
          required={status === "excluded"}
          placeholder="Un choix à expliquer ou une question à trancher…"
          bind:value={notes}></textarea>
      </fieldset>
      {#if error}<p role="alert" class="service-warning">{error}</p>{/if}
      <span class="onagre-context"
        >{version ? `Version ${version}` : "Aucune décision enregistrée"}</span
      >
    </div>
  </form>
  {#snippet footer()}
    <div class="service-editor-footer">
      {#if pending}<p role="alert">Vos modifications ne sont pas enregistrées.</p>
        <button type="button" class="fr-btn fr-btn--secondary" onclick={() => (pending = null)}
          >Continuer la saisie</button
        ><button type="button" class="fr-btn" onclick={discard}>Abandonner les modifications</button
        >
      {:else}<span role="status"
          >{busy
            ? "Enregistrement…"
            : dirty
              ? "Modifications non enregistrées"
              : saved
                ? "Correspondance enregistrée."
                : "Aucune modification en attente"}</span
        >
        {#if writable}<button
            type="submit"
            form="service-decision"
            class="fr-btn fr-btn--secondary"
            disabled={busy || service.absent || (!dirty && !service.needsReview)}
            >Enregistrer</button
          >
          <button
            type="submit"
            form="service-decision"
            name="intent"
            value="next"
            class="fr-btn"
            disabled={busy || service.absent || nextId === null}
            title={nextId === null ? "Dernier service de la sélection" : undefined}
            >Enregistrer et continuer</button
          >
        {/if}
      {/if}
    </div>
  {/snippet}
</WorkspaceDialog>
