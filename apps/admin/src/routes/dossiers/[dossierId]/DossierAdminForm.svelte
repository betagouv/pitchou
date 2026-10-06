<script lang="ts">
  import { can } from "$lib/access.svelte.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import type { SelectEntry } from "@pitchou/ui/Select/options.ts";
  import type { ActiviteAdmin } from "$lib/actions/adminActivites.ts";
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
    activites: ActiviteAdmin[];
    activiteEntries?: SelectEntry<string>[];
    activiteCodeByLabel: ReadonlyMap<string, string>;
    onSaved: (detail: AdminDossierDetail) => void;
    onFilesChanged: () => Promise<void>;
    formId?: string;
    onSavingChange?: (saving: boolean) => void;
  };

  let {
    detail,
    activites,
    activiteEntries,
    activiteCodeByLabel,
    onSaved,
    onFilesChanged,
    formId = "dossier-admin-edit-form",
    onSavingChange = () => {},
  }: Props = $props();

  // The parent replaces detail after saving, but this mounted form keeps its local edits.
  // svelte-ignore state_referenced_locally
  const dossier = detail.dossier;
  // svelte-ignore state_referenced_locally
  const readOnly = $derived(detail.source !== "pitchou" || !can("admin:dossiers:update"));
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierAdminFormModel(detail));
  let saveError = $state<string | null>(null);
  const completeEcologicalInventory = $derived(model.ecologicalInventoryCompleted === "oui");

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!can("admin:dossiers:update")) return;
    if (!readOnly && !model.depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    onSavingChange(true);
    saveError = null;
    const confirmSaved = pageHeader.beginSave("Dossier enregistré");
    try {
      const payload: AdminDossierUpdatePayload = {
        columns: buildDossierUpdateColumns(model, readOnly, activiteCodeByLabel),
      };
      if (!readOnly) payload.relations = buildDossierRelations(model);
      const updated = await updateDossier(dossier.id, payload);
      onSaved(updated);
      confirmSaved();
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      onSavingChange(false);
    }
  }
</script>

<form id={formId} class="dossier-form" style="overflow-anchor: none" onsubmit={save}>
  {#if readOnly}
    <p class="fr-hint-text fr-mb-0">Les données importées sont affichées en lecture seule.</p>
  {/if}

  <DossierIntroductionFields {model} {activites} {activiteEntries} disabled={readOnly} />

  {#if completeEcologicalInventory}
    {#if !readOnly}<DossierRelationsFields {model} />{/if}
    <DossierDescriptionFields {model} disabled={readOnly} />
    {#if detail.source === "pitchou"}
      <DossierAdminFiles
        {detail}
        onChanged={onFilesChanged}
        kind="especes-impactees"
        title="3. Espèces concernées par la dérogation"
      />
    {/if}
    <DossierDerogationFields {model} disabled={readOnly} />
    <section aria-labelledby="project-details-title">
      <h2 id="project-details-title">5. Détails du projet</h2>
      <DossierOperationPeriodFields {model} disabled={readOnly} complete={true} />
    </section>
  {:else}
    <DossierOperationPeriodFields {model} disabled={readOnly} complete={false} />
  {/if}

  {#if detail.source === "pitchou"}
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
</form>
