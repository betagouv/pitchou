<script lang="ts">
  import { buildDemandeComparison, compareDemandes } from "@pitchou/common/demandeComparison.ts";
  import type { DemandeVersion, DossierWorkspace } from "@pitchou/types/dossierDemandes.ts";
  import VersionPicker from "./DossierVersions/VersionPicker.svelte";
  import DifferenceTable from "./DossierVersions/DifferenceTable.svelte";
  import VersionDocument from "./DossierVersions/VersionDocument.svelte";
  import VersionAttachments from "./DossierVersions/VersionAttachments.svelte";
  import { fetchVersionData } from "./DossierVersions/api.ts";
  let { dossierId }: { dossierId: number } = $props();
  let workspace = $state<DossierWorkspace>();
  let opened = $state(false);
  let comparing = $state(false);
  let left = $state<DemandeVersion>();
  let right = $state<DemandeVersion>();
  let errorMessage = $state("");
  let leftLabel = $state("");
  let rightLabel = $state("");
  $effect(() => {
    if (!opened) return;
    const controller = new AbortController();
    void fetchVersionData<DossierWorkspace>(`/dossier/${dossierId}/demandes`, controller.signal)
      .then((result) => {
        workspace = result;
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      });
    return () => controller.abort();
  });
  const leftDocument = $derived(left ? buildDemandeComparison(left) : undefined);
  const differences = $derived(
    leftDocument && right
      ? compareDemandes(leftDocument, buildDemandeComparison(right))
      : undefined,
  );
</script>

<section class="fr-mb-4w">
  <button
    type="button"
    class="fr-btn fr-btn--secondary"
    aria-expanded={opened}
    onclick={() => {
      opened = !opened;
    }}>Consulter et comparer les états</button
  >
  {#if opened}
    <div class="fr-mt-3w fr-mb-3w flex flex-wrap items-center justify-between gap-4">
      <div
        class="mode-switch inline-flex rounded-lg border border-[var(--border-default-grey)] p-1"
        role="group"
        aria-label="Mode de consultation"
      >
        <button
          type="button"
          aria-pressed={!comparing}
          onclick={() => {
            comparing = false;
          }}>Consulter un état</button
        >
        <button
          type="button"
          aria-pressed={comparing}
          onclick={() => {
            comparing = true;
          }}>Comparer</button
        >
      </div>
      <span class="flex items-center gap-2 text-sm text-[var(--text-mention-grey)]"
        ><span class="fr-icon-lock-line fr-icon--sm" aria-hidden="true"></span>Consultation en
        lecture seule</span
      >
    </div>
    {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
    {#if workspace}
      <div class={["mb-6 grid gap-4", comparing && "lg:grid-cols-2"]}>
        <VersionPicker
          id="version-left"
          label={comparing ? "État de référence" : "État à consulter"}
          demandes={workspace.demandes}
          initialDemandeId={dossierId}
          onLabelChange={(label) => {
            leftLabel = label;
          }}
          onChange={(value) => {
            left = value;
          }}
        />
        {#if comparing}<VersionPicker
            id="version-right"
            label="État comparé"
            demandes={workspace.demandes}
            initialDemandeId={workspace.demandes.find((d) => d.id !== dossierId)?.id ?? dossierId}
            onLabelChange={(label) => {
              rightLabel = label;
            }}
            onChange={(value) => {
              right = value;
            }}
          />{/if}
      </div>
      {#if comparing}
        {#if leftDocument && right && differences}<DifferenceTable
            {differences}
            {leftLabel}
            {rightLabel}
          />{/if}
      {:else if leftDocument}
        {#if left}<VersionAttachments dossier={left.dossier} />{/if}
        <VersionDocument document={leftDocument} />
      {/if}
    {/if}
  {/if}
</section>

<style>
  .mode-switch button {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
  }
  .mode-switch button[aria-pressed="true"] {
    background: var(--background-contrast-blue-france);
    color: var(--text-action-high-blue-france);
  }
</style>
