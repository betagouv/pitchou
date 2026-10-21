<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import { setFileAccess } from "../fileAccess.ts";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import { tick } from "svelte";

  import type { SelectEntry } from "@pitchou/ui/Select/options.ts";

  import type { ActiviteAdmin } from "#lib/actions/adminActivites.ts";
  import { updateDossier, type AdminDossierDetail } from "#lib/actions/adminDossiers.ts";

  import DossierIntakeFields from "../nouveau/DossierIntakeFields.svelte";
  import {
    buildCreationPayload,
    buildNativeEditPayload,
    clearSelectedDossierFiles,
    createDossierCreationModelFromDetail,
    hasLegalSiretChanged,
    legalSiretError,
    porteurEntreprise,
    mergeDossierRelationsForEdit,
    type CompanyDetailsChoice,
  } from "../nouveau/dossierCreationModel.ts";
  import DossierAdminFiles from "./DossierAdminFiles.svelte";
  setFileAccess({
    attachments: () => can("admin:dossiers:files"),
    species: () => can("admin:dossiers:species"),
  });

  let {
    detail,
    activites,
    activiteEntries,
    activiteCodeByLabel,
    onSaved,
    onFilesChanged,
    formId = "dossier-admin-edit-form",
    onSavingChange = () => {},
  }: {
    detail: AdminDossierDetail;
    activites: ActiviteAdmin[];
    activiteEntries?: SelectEntry<string>[];
    activiteCodeByLabel: ReadonlyMap<string, string>;
    onSaved: (detail: AdminDossierDetail) => void;
    onFilesChanged: () => Promise<void>;
    formId?: string;
    onSavingChange?: (saving: boolean) => void;
  } = $props();
  // These models intentionally retain in-progress edits when the parent refreshes its detail.
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierCreationModelFromDetail(detail, activiteCodeByLabel));
  // svelte-ignore state_referenced_locally
  let initialRelations = structuredClone(
    mergeDossierRelationsForEdit(buildCreationPayload(model).relations, detail, ""),
  );
  let saveError = $state<string | null>(null);
  let showPorteurErrors = $state(false);
  let formVersion = $state(0);
  let companyDetailsChoice = $state<CompanyDetailsChoice>("");
  const legalSiretChanged = $derived(
    model.demandeurType === "personne_morale" && hasLegalSiretChanged(detail, model.legalSiret),
  );

  function invalidPorteurField(): string | null {
    if (!model.demandeurType) return "demandeur-physical";
    if (model.demandeurType === "personne_physique") {
      if (!model.physicalLastName.trim()) return "physical-last-name";
      if (!model.physicalFirstNames.trim()) return "physical-first-names";
    }
    if (model.demandeurType === "personne_morale" && legalSiretError(model.legalSiret)) {
      return "legal-siret";
    }
    return null;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const invalidField = invalidPorteurField();
    if (invalidField) {
      // Shown under each invalid field, with the focus on the first one.
      showPorteurErrors = true;
      saveError = null;
      await tick();
      document.querySelector<HTMLElement>(`#${CSS.escape(invalidField)}`)?.focus();
      return;
    }
    if (legalSiretChanged && !companyDetailsChoice) {
      saveError = "Indiquez si les informations de l'entreprise doivent être conservées.";
      return;
    }
    onSavingChange(true);
    const confirmSaved = pageHeader.beginSave("Dossier enregistré");
    saveError = null;
    try {
      const { payload, relations, attachments } = buildNativeEditPayload(
        model,
        detail,
        companyDetailsChoice,
        initialRelations,
      );
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
      confirmSaved();
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      onSavingChange(false);
    }
  }
</script>

<form id={formId} class="dossier-form" style="overflow-anchor: none" novalidate onsubmit={save}>
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
      {activites}
      {activiteEntries}
      {activiteCodeByLabel}
      showAdminSection={false}
      showFirstSectionTopBorder={false}
      originalLegalSiret={porteurEntreprise(detail)?.siret}
      {companyDetailsChoice}
      onCompanyDetailsChoice={(choice) => (companyDetailsChoice = choice)}
      {showPorteurErrors}
      {existingSpeciesFiles}
      {existingAttachments}
    />
  {/key}

  {#if saveError}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
  {/if}
</form>
