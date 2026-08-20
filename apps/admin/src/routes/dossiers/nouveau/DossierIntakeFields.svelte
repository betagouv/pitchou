<script lang="ts">
  import type { Snippet } from "svelte";

  import type { SelectEntry } from "@pitchou/ui/Select/options.ts";
  import type { ActiviteAdmin } from "$lib/actions/adminActivites.ts";
  import type { AdminGroupeInstructeurs } from "$lib/actions/adminDossiers.ts";

  import DossierCreationAdminSection from "./DossierCreationAdminSection.svelte";
  import DossierCreationDemandeurSection from "./DossierCreationDemandeurSection.svelte";
  import DossierCreationDetailsSection from "./DossierCreationDetailsSection/DossierCreationDetailsSection.svelte";
  import DossierCreationInformationSection from "./DossierCreationInformationSection.svelte";
  import DossierCreationJustificationSection from "./DossierCreationJustificationSection.svelte";
  import DossierCreationLocationSection from "./DossierCreationLocationSection.svelte";
  import DossierCreationMapSection from "./DossierCreationMapSection.svelte";
  import DossierCreationProjectSection from "./DossierCreationProjectSection.svelte";
  import DossierCreationSpeciesSection from "./DossierCreationSpeciesSection.svelte";
  import {
    showsSpeciesSection,
    type CompanyDetailsChoice,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";

  let {
    model,
    groupes,
    activites,
    activiteEntries,
    activiteCodeByLabel,
    showAdminSection = true,
    showFirstSectionTopBorder = true,
    originalLegalSiret,
    companyDetailsChoice = "",
    onCompanyDetailsChoice = () => {},
    existingSpeciesFiles,
    existingAttachments,
  }: {
    model: DossierCreationModel;
    groupes: AdminGroupeInstructeurs[];
    activites: ActiviteAdmin[];
    /** Grouped, illustrated options over the same activities; plain labels when absent. */
    activiteEntries?: SelectEntry<string>[];
    /** Every known raw label mapped to its activity code — the resolution the server applies. */
    activiteCodeByLabel: ReadonlyMap<string, string>;
    showAdminSection?: boolean;
    showFirstSectionTopBorder?: boolean;
    originalLegalSiret?: string | null;
    companyDetailsChoice?: CompanyDetailsChoice;
    onCompanyDetailsChoice?: (choice: CompanyDetailsChoice) => void;
    existingSpeciesFiles?: Snippet;
    existingAttachments?: Snippet;
  } = $props();
</script>

<DossierCreationInformationSection {model} showTopBorder={showFirstSectionTopBorder} />
<DossierCreationProjectSection {model} {activites} {activiteEntries} {activiteCodeByLabel} />
<DossierCreationDemandeurSection
  {model}
  {originalLegalSiret}
  {companyDetailsChoice}
  {onCompanyDetailsChoice}
/>
<DossierCreationLocationSection {model} />
<DossierCreationMapSection {model} />
{#if showsSpeciesSection(model)}
  <DossierCreationSpeciesSection {model} existingFiles={existingSpeciesFiles} />
  <DossierCreationJustificationSection {model} />
{/if}
<DossierCreationDetailsSection {model} {existingAttachments} />
{#if showAdminSection}<DossierCreationAdminSection {model} {groupes} />{/if}
