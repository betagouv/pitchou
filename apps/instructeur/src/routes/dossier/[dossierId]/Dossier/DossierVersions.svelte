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
    <p class="fr-mt-2w">
      Chaque modification conserve un état de la demande. Les états historiques sont en lecture
      seule. Les états antérieurs à l’activation de cet historique ne sont pas reconstitués.
    </p>
    {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
    {#if workspace}
      <label class="flex gap-2 fr-mb-2w"
        ><input type="checkbox" bind:checked={comparing} />Comparer deux états ou demandes</label
      >
      <div class="flex flex-col gap-6 md:flex-row">
        <VersionPicker
          id="version-left"
          label={comparing ? "À gauche" : "État à consulter"}
          demandes={workspace.demandes}
          initialDemandeId={dossierId}
          onChange={(value) => {
            left = value;
          }}
        />
        {#if comparing}<VersionPicker
            id="version-right"
            label="À droite"
            demandes={workspace.demandes}
            initialDemandeId={workspace.demandes.find((d) => d.id !== dossierId)?.id ?? dossierId}
            onChange={(value) => {
              right = value;
            }}
          />{/if}
      </div>
      {#if comparing}
        {#if leftDocument && right && differences}<DifferenceTable {differences} />{/if}
      {:else if leftDocument}
        {#if left}<VersionAttachments dossier={left.dossier} />{/if}
        <VersionDocument document={leftDocument} />
      {/if}
    {/if}
  {/if}
</section>
