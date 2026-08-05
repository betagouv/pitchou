<script lang="ts">
  import {
    updateDossier,
    type AdminDossierDetail,
    type AdminDossierUpdatePayload,
  } from "$lib/actions/adminDossiers.ts";

  import {
    buildDossierRelations,
    buildDossierUpdateColumns,
    createDossierAdminFormModel,
  } from "./dossierAdminFormModel.ts";
  import DossierAdminFiles from "./DossierAdminFiles.svelte";
  import DossierDescriptionFields from "./DossierDescriptionFields.svelte";
  import DossierDerogationFields from "./DossierDerogationFields.svelte";
  import DossierIntroductionFields from "./DossierIntroductionFields.svelte";
  import DossierOperationPeriodFields from "./DossierOperationPeriodFields.svelte";
  import DossierRelationsFields from "./DossierRelationsFields.svelte";

  type Props = {
    detail: AdminDossierDetail;
    onSaved: (detail: AdminDossierDetail) => void;
    onFilesChanged: () => Promise<void>;
    formId?: string;
    onSavingChange?: (saving: boolean) => void;
  };

  let {
    detail,
    onSaved,
    onFilesChanged,
    formId = "dossier-admin-edit-form",
    onSavingChange = () => {},
  }: Props = $props();

  // The parent replaces detail after saving, but this mounted form keeps its local edits.
  // svelte-ignore state_referenced_locally
  const dossier = detail.dossier;
  // svelte-ignore state_referenced_locally
  const managedByDn = detail.managedByDn;
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierAdminFormModel(detail));
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  const completeEcologicalInventory = $derived(model.ecologicalInventoryCompleted === "oui");

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!managedByDn && !model.depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    onSavingChange(true);
    saveError = null;
    saved = false;
    try {
      const payload: AdminDossierUpdatePayload = {
        columns: buildDossierUpdateColumns(model, managedByDn),
      };
      if (!managedByDn) payload.relations = buildDossierRelations(model);
      const updated = await updateDossier(dossier.id, payload);
      onSaved(updated);
      saved = true;
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      onSavingChange(false);
    }
  }
</script>

<form
  id={formId}
  class="w-full flex flex-col gap-6 fr-mt-3w"
  style="overflow-anchor: none"
  onsubmit={save}
>
  {#if managedByDn}
    <p class="fr-hint-text fr-mb-0">
      Les sections importées de Démarches Numériques sont affichées en lecture seule.
    </p>
  {/if}

  <DossierIntroductionFields {model} disabled={managedByDn} />

  {#if completeEcologicalInventory}
    {#if !managedByDn}<DossierRelationsFields {model} />{/if}
    <DossierDescriptionFields {model} disabled={managedByDn} />
    {#if !managedByDn}
      <DossierAdminFiles
        {detail}
        onChanged={onFilesChanged}
        kind="especes-impactees"
        title="3. Espèces concernées par la dérogation"
      />
    {/if}
    <DossierDerogationFields {model} disabled={managedByDn} />
    <section aria-labelledby="project-details-title">
      <h2 class="fr-h3" id="project-details-title">5. Détails du projet</h2>
      <DossierOperationPeriodFields {model} disabled={managedByDn} complete={true} />
    </section>
  {:else}
    <DossierOperationPeriodFields {model} disabled={managedByDn} complete={false} />
  {/if}

  {#if !managedByDn}
    <DossierAdminFiles
      {detail}
      onChanged={onFilesChanged}
      kind="pieces-jointes"
      title={completeEcologicalInventory ? "5.2. Pièces jointes" : "0.2. Pièces jointes"}
    />
  {/if}

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
  {/if}
  {#if saved}
    <div class="fr-alert fr-alert--success fr-alert--sm" role="status">
      <p>Dossier enregistré.</p>
    </div>
  {/if}
</form>
