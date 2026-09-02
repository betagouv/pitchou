<script lang="ts">
  import EspecesProtegeesGroupedByTypeImpact from "$lib/components/EspecesProtegeesGroupedByTypeImpact.svelte";
  import { createEspecesGroupedByTypeImpact } from "$lib/especes/createEspecesGroupedByTypeImpact.ts";
  import ModalPrefillFromText from "./SaisieEspeces/ModalPrefillFromText.svelte";
  import FormSaisieEspece from "./SaisieEspeces/FormSaisieEspece.svelte";
  import Loader from "@pitchou/ui/Loader.svelte";
  import TileSaisieEspece from "./SaisieEspeces/TileSaisieEspece.svelte";
  import SaisieEspecesHeader from "./SaisieEspeces/SaisieEspecesHeader.svelte";
  import ImportEspecesModal from "./SaisieEspeces/ImportEspecesModal.svelte";
  import SaisieValidationModal from "./SaisieEspeces/SaisieValidationModal.svelte";
  import { tick } from "svelte";
  import { descriptionMenacesEspecesToOdsArrayBuffer } from "@pitchou/common/especesUtils.ts";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import { flattenImpactedEspeces } from "./SaisieEspeces/impactedEspeces.ts";
  import type {
    ActiviteMenancante,
    ByClassification,
    DescriptionImpact,
    DescriptionMenacesEspeces,
    EspeceProtegee,
    FauneNonOiseauAtteinte,
    FloreAtteinte,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
    OiseauAtteint,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    espècesProtégéesParClassification: ByClassification<EspeceProtegee[]>;
    activitesParClassificationEtreVivant: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ByClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ByClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
    importDescriptionMenacesEspècesFromOds: (
      buffer: ArrayBuffer,
    ) => Promise<DescriptionMenacesEspeces>;
    oiseauxAtteints: OiseauAtteint[];
    faunesNonOiseauxAtteintes: FauneNonOiseauAtteinte[];
    floresAtteintes: FloreAtteinte[];
  };
  let {
    espècesProtégéesParClassification: especes,
    activitesParClassificationEtreVivant: activites,
    méthodesParClassificationEtreVivant: methodes,
    transportsParClassificationEtreVivant: transports,
    importDescriptionMenacesEspècesFromOds: importOds,
  }: Props = $props();
  let impacted: Array<{ espèce?: EspeceProtegee; impacts?: DescriptionImpact[] }> = $state([
    { impacts: [{}] },
  ]);
  const count = $derived(impacted.filter((item) => item.espèce).length);
  let odsFile: File | undefined = $state();
  let importError: string | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();
  let importModal: HTMLElement | undefined = $state();
  let readingMode = $state(false);
  let references: TileSaisieEspece[] = $state([]);
  const grouped: DescriptionMenacesEspeces = $derived.by(() => {
    const result: DescriptionMenacesEspeces = { oiseau: [], "faune non-oiseau": [], flore: [] };
    for (const item of impacted)
      for (const impact of item.impacts ?? [])
        if (item.espèce)
          result[item.espèce.classification].push({ espèce: item.espèce, ...impact } as any);
    return result;
  });
  const referentiels = loadActivitesMethodesMoyensDePoursuite();

  async function createOdsBlob() {
    return new Blob([await descriptionMenacesEspecesToOdsArrayBuffer(grouped)], {
      type: "application/vnd.oasis.opendocument.spreadsheet",
    });
  }
  function onFile(event: Event & { currentTarget: HTMLInputElement }) {
    importError = undefined;
    odsFile = event.currentTarget.files?.[0];
  }
  async function importFromOds() {
    try {
      if (!odsFile) throw new Error("Aucun fichier espèces .ods n'a été téléchargé.");
      const description = await odsFile.arrayBuffer().then(importOds);
      if (Object.keys(description).length) impacted = flattenImpactedEspeces(description);
      // @ts-ignore DSFR installs this browser global.
      if (importModal) window.dsfr(importModal).modal.conceal();
    } catch (error) {
      importError =
        error instanceof Error && error.cause === "format incorrect"
          ? `Le fichier ne respecte pas le format décrit dans <a href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods" target="_blank">la documentation des fichiers d'espèces.</a>`
          : error instanceof Error
            ? error.message
            : "Une erreur est survenue.";
      fileInput?.focus();
      throw error;
    }
  }
  async function importFromText(
    items: Array<{ espece: EspeceProtegee; impacts?: DescriptionImpact[] }>,
  ) {
    if (!items.length) return;
    impacted = items;
    await tick();
    references = references.filter(Boolean);
    references.at(-1)?.focusEspeceForm();
  }
</script>

<svelte:head><title>Espèces protégées impactées — Pitchou</title></svelte:head>
<article>
  <SaisieEspecesHeader bind:readingMode />
  <ImportEspecesModal
    bind:modal={importModal}
    bind:input={fileInput}
    error={importError}
    {onFile}
    onImport={importFromOds}
  />
  <ModalPrefillFromText
    bind:référencesEspèces={references}
    espècesProtégéesParClassification={especes}
    onClickPréRemplirAvecDocumentTexte={importFromText}
    méthodesParClassificationEtreVivant={methodes}
    transportsParClassificationEtreVivant={transports}
    activitesParClassificationEtreVivant={activites}
  />
  {#if readingMode}
    {#if count === 0}<div class="fr-alert fr-alert--warning fr-mb-2w">
        <p>Aucune espèce n'a encore été saisie.</p>
      </div>{:else}
      <div class="fr-alert fr-alert--info fr-mb-2w">
        <p>
          Mode lecture activé : les espèces sont affichées regroupées par type d'impact. Désactivez
          le mode lecture pour modifier les espèces.
        </p>
      </div>
      {#await referentiels}<Loader />{:then data}<EspecesProtegeesGroupedByTypeImpact
          especesParTypeImpact={createEspecesGroupedByTypeImpact(
            grouped,
            data.identifiantPitchouVersActivitéEtImpactsQuantifiés,
          )}
        />{/await}
    {/if}
  {:else}
    <FormSaisieEspece
      bind:espècesImpactées={impacted}
      bind:référencesEspèces={references}
      espècesProtégées={[...especes.oiseau, ...especes["faune non-oiseau"], ...especes.flore]}
      activitesParClassificationEtreVivant={activites}
      méthodesParClassificationEtreVivant={methodes}
      transportsParClassificationEtreVivant={transports}
    />
  {/if}
  <footer class="fr-mb-4w flex justify-end">
    <button
      aria-controls="modale-validation-saisie"
      data-fr-opened="false"
      type="button"
      class="fr-btn fr-btn--lg fr-ml-auto">Valider ma saisie</button
    >
  </footer>
  <SaisieValidationModal {count} createBlob={createOdsBlob} />
</article>
