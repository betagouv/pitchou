<script lang="ts">
  import {
    loadDossierDetail,
    updateDossier,
    uploadEspecesImpactees,
    uploadPieceJointe,
    type AdminDossierDetail,
    type AdminDossierRelationsPayload,
    type AdminDossierUpdatePayload,
  } from "$lib/actions/adminDossiers.ts";

  import DossierIntakeFields from "../nouveau/DossierIntakeFields.svelte";
  import {
    buildCreationPayload,
    clearSelectedDossierFiles,
    createDossierCreationModelFromDetail,
    selectedDossierAttachmentFiles,
  } from "../nouveau/dossierCreationModel.ts";
  import DossierAdminFiles from "./DossierAdminFiles.svelte";

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
  // These models intentionally retain in-progress edits when the parent refreshes its detail.
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierCreationModelFromDetail(detail));
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  let formVersion = $state(0);

  function mergeRelations(relations: AdminDossierRelationsPayload): AdminDossierRelationsPayload {
    const identites = [
      ...relations.identites,
      ...detail.identites.filter(
        ({ type }) =>
          type === "mandataire" && !relations.identites.some((item) => item.type === type),
      ),
    ];
    if (relations.demandeur_type === "personne_morale" && detail.demandeur_personne_morale) {
      return {
        ...relations,
        identites,
        demandeur_personne_morale: {
          ...detail.demandeur_personne_morale,
          siret: relations.demandeur_personne_morale.siret,
        },
      };
    }
    return { ...relations, identites };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    onSavingChange(true);
    saved = false;
    saveError = null;
    try {
      const intake = buildCreationPayload(model);
      const attachments = selectedDossierAttachmentFiles(model);
      const allFiles = [...(model.speciesFile ? [model.speciesFile] : []), ...attachments];
      if (allFiles.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
        throw new Error("La taille totale des fichiers ne doit pas dépasser 65 Mo.");
      }
      const payload: AdminDossierUpdatePayload = {
        columns: {
          ...intake.columns,
          name: intake.name,
          depot_date: intake.depot_date,
        },
        relations: mergeRelations(intake.relations),
      };
      await updateDossier(detail.dossier.id, payload);
      if (model.speciesFile) await uploadEspecesImpactees(detail.dossier.id, model.speciesFile);
      for (const file of attachments) await uploadPieceJointe(detail.dossier.id, file);
      clearSelectedDossierFiles(model);
      formVersion += 1;
      const updated = await loadDossierDetail(detail.dossier.id);
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
  class="w-full flex flex-col gap-10 fr-mt-3w"
  style="overflow-anchor: none"
  novalidate
  onsubmit={save}
>
  {#snippet existingSpeciesFiles()}
    {#if detail.especesImpactees}
      <DossierAdminFiles
        {detail}
        onChanged={onFilesChanged}
        kind="especes-impactees"
        title="Fichier actuellement enregistré"
        allowUpload={false}
        embedded
      />
    {/if}
  {/snippet}
  {#snippet existingAttachments()}
    {#if detail.piecesJointes.length >= 1}
      <DossierAdminFiles
        {detail}
        onChanged={onFilesChanged}
        kind="pieces-jointes"
        title="Pièces jointes enregistrées"
        allowUpload={false}
        embedded
      />
    {/if}
  {/snippet}

  {#key formVersion}
    <DossierIntakeFields
      {model}
      groupes={[]}
      showAdminSection={false}
      showFirstSectionTopBorder={false}
      {existingSpeciesFiles}
      {existingAttachments}
    />
  {/key}

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
  {/if}
  {#if saved}
    <div class="fr-alert fr-alert--success fr-alert--sm" role="status">
      <p>Dossier enregistré.</p>
    </div>
  {/if}
</form>
