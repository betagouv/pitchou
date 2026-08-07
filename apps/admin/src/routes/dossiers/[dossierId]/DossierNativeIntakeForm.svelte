<script lang="ts">
  import { onMount } from "svelte";

  import {
    loadGroupesInstructeurs,
    updateDossier,
    type AdminDossierDetail,
    type AdminGroupeInstructeurs,
    type AdminDossierUpdatePayload,
  } from "$lib/actions/adminDossiers.ts";

  import DossierIntakeFields from "../nouveau/DossierIntakeFields.svelte";
  import {
    buildCreationPayload,
    clearSelectedDossierFiles,
    createDossierCreationModelFromDetail,
    hasLegalSiretChanged,
    mergeDossierRelationsForEdit,
    selectedDossierAttachmentFiles,
    type CompanyDetailsChoice,
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
  // svelte-ignore state_referenced_locally
  let initialRelations = structuredClone(
    mergeDossierRelationsForEdit(buildCreationPayload(model).relations, detail, ""),
  );
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  let formVersion = $state(0);
  let groupes = $state<AdminGroupeInstructeurs[]>([]);
  let groupesLoadError = $state<string | null>(null);
  let companyDetailsChoice = $state<CompanyDetailsChoice>("");
  const missingGroupe = $derived(detail.groupe === null);
  const legalSiretChanged = $derived(
    model.demandeurType === "personne_morale" && hasLegalSiretChanged(detail, model.legalSiret),
  );

  onMount(async () => {
    if (!missingGroupe) return;
    try {
      groupes = await loadGroupesInstructeurs();
    } catch {
      groupesLoadError = "Impossible de charger les groupes instructeurs.";
    }
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!model.groupeInstructeurs) {
      saveError = "Sélectionnez un groupe instructeurs avant d'enregistrer le dossier.";
      return;
    }
    if (legalSiretChanged && !companyDetailsChoice) {
      saveError = "Indiquez si les informations de l'entreprise doivent être conservées.";
      return;
    }
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
      };
      const relations = mergeDossierRelationsForEdit(
        intake.relations,
        detail,
        companyDetailsChoice,
      );
      if (JSON.stringify(relations) !== JSON.stringify(initialRelations)) {
        payload.relations = relations;
      }
      const updated = await updateDossier(
        detail.dossier.id,
        payload,
        model.speciesFile,
        attachments,
      );
      clearSelectedDossierFiles(model);
      initialRelations = structuredClone(relations);
      formVersion += 1;
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
    {#if missingGroupe}
      <div class="fr-alert fr-alert--warning" role="alert">
        <h2 class="fr-alert__title">Groupe instructeurs à réattribuer</h2>
        <p>
          Le groupe précédemment associé à ce dossier n'existe plus. Sélectionnez un nouveau groupe
          pour rendre le dossier de nouveau accessible aux instructeurs.
        </p>
      </div>
      <div class="fr-select-group">
        <label class="fr-label" for="native-dossier-groupe">
          Nouveau groupe instructeurs
          <span class="fr-hint-text">Le dossier ne sera visible que par ce groupe.</span>
        </label>
        <select
          class="fr-select"
          id="native-dossier-groupe"
          required
          bind:value={model.groupeInstructeurs}
        >
          <option value="">Sélectionner un groupe</option>
          {#each groupes as groupe (groupe.id)}
            <option value={groupe.id}>{groupe.name} (DN {groupe.demarche_number})</option>
          {/each}
        </select>
        {#if groupesLoadError}<p class="fr-error-text">{groupesLoadError}</p>{/if}
      </div>
    {/if}

    <DossierIntakeFields
      {model}
      groupes={[]}
      showAdminSection={false}
      showFirstSectionTopBorder={false}
      originalLegalSiret={detail.demandeur_personne_morale?.siret}
      {companyDetailsChoice}
      onCompanyDetailsChoice={(choice) => (companyDetailsChoice = choice)}
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
