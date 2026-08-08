<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import ClassificationImpactSection from "./ClassificationImpactSection.svelte";
  import { tick } from "svelte";
  import { removePrefillEspece } from "./removePrefillEspece.ts";

  import type {
    EspeceProtegee,
    DescriptionImpact,
    ByClassification,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    écranAffiché: "champTexte" | "préciserImpact";
    espècesImpactéesPourPréremplir: Array<{
      espèce?: EspeceProtegee;
      impacts: DescriptionImpact[];
    }>;
    supprimerEspèceImpactée: (indexEspeceASupprimer: number) => Promise<void>;
    préremplirAvecCesEspècesImpacts: () => void;
    activitesParClassificationEtreVivant?: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ByClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ByClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
    addImpactForEachClassification: (
      impactForEachOiseau: DescriptionImpact,
      impactForEachFauneNonOiseau: DescriptionImpact,
      impactForEachFlore: DescriptionImpact,
    ) => void;
  };

  let {
    écranAffiché: displayedScreen = $bindable(),
    espècesImpactéesPourPréremplir: especesImpacteesToPrefill,
    supprimerEspèceImpactée: removeEspeceImpactee,
    préremplirAvecCesEspècesImpacts: prefillWithTheseEspecesImpacts,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
    addImpactForEachClassification,
  }: Props = $props();

  let impactForEachOiseau: DescriptionImpact = $state({});

  let impactForEachFauneNonOiseau: DescriptionImpact = $state({});

  let impactForEachFlore: DescriptionImpact = $state({});

  //@ts-ignore
  let oiseauxToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "oiseau",
      ),
    ),
  );
  //@ts-ignore
  let fauneNonOiseauxToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "faune non-oiseau",
      ),
    ),
  );
  //@ts-ignore
  let floreToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "flore",
      ),
    ),
  );

  let modalTitle: HTMLElement;

  /**
   * Reference to the back button
   */
  let backButton: HTMLButtonElement | undefined = $state();

  /**
   * Array of references to the delete buttons, indexed by the index in espècesImpactéesPourPréremplir
   */
  let deleteButtonRefs: HTMLElement[] = $state([]);

  $effect.pre(() => {
    if (displayedScreen === "préciserImpact") {
      tick().then(() => {
        modalTitle.focus();
      });
    }
  });

  async function removeEspeceImpacteeFromClassification(espece: EspeceProtegee) {
    await removePrefillEspece(
      espece,
      especesImpacteesToPrefill,
      removeEspeceImpactee,
      deleteButtonRefs,
      backButton,
    );
  }

  function onClickAddAll() {
    addImpactForEachClassification(
      impactForEachOiseau,
      impactForEachFauneNonOiseau,
      impactForEachFlore,
    );
    prefillWithTheseEspecesImpacts();
  }
</script>

<div class="fr-modal__header">
  <button
    aria-controls="modale-préremplir-depuis-texte"
    title="Fermer"
    type="button"
    class="fr-btn--close fr-btn">Fermer</button
  >
</div>
<div class="fr-modal__content">
  <h2
    bind:this={modalTitle}
    id="modale-préremplir-depuis-texte-title"
    class="fr-modal__title"
    tabindex="-1"
  >
    Préciser l'impact pour chaque type d'espèce
  </h2>
  <div>
    {#if oiseauxToPrefill.size === 0 && fauneNonOiseauxToPrefill.size === 0 && floreToPrefill.size === 0}
      Aucune espèce n'a été renseignée.
    {:else}
      {#if oiseauxToPrefill.size}<ClassificationImpactSection
          especes={oiseauxToPrefill}
          all={especesImpacteesToPrefill}
          label={oiseauxToPrefill.size >= 2 ? "oiseaux" : "oiseau"}
          classification="oiseau"
          bind:impact={impactForEachOiseau}
          index={0}
          bind:deleteButtonRefs
          onRemove={removeEspeceImpacteeFromClassification}
          activites={activitesParClassificationEtreVivant}
          methodes={methodesParClassificationEtreVivant}
          transports={transportsParClassificationEtreVivant}
        />{/if}
      {#if fauneNonOiseauxToPrefill.size}<ClassificationImpactSection
          especes={fauneNonOiseauxToPrefill}
          all={especesImpacteesToPrefill}
          label={`${fauneNonOiseauxToPrefill.size >= 2 ? "faunes" : "faune"} non-oiseau`}
          classification="faune non-oiseau"
          bind:impact={impactForEachFauneNonOiseau}
          index={1}
          bind:deleteButtonRefs
          onRemove={removeEspeceImpacteeFromClassification}
          activites={activitesParClassificationEtreVivant}
          methodes={methodesParClassificationEtreVivant}
          transports={transportsParClassificationEtreVivant}
        />{/if}
      {#if floreToPrefill.size}<ClassificationImpactSection
          especes={floreToPrefill}
          all={especesImpacteesToPrefill}
          label={floreToPrefill.size >= 2 ? "flores" : "flore"}
          classification="flore"
          bind:impact={impactForEachFlore}
          index={2}
          bind:deleteButtonRefs
          onRemove={removeEspeceImpacteeFromClassification}
          activites={activitesParClassificationEtreVivant}
          methodes={methodesParClassificationEtreVivant}
          transports={transportsParClassificationEtreVivant}
        />{/if}
    {/if}
  </div>
</div>

<div class="fr-modal__footer">
  <button
    bind:this={backButton}
    type="button"
    class="fr-btn fr-btn--secondary fr-ml-auto"
    onclick={() => (displayedScreen = "champTexte")}>Retour</button
  >
  <button
    aria-controls="modale-préremplir-depuis-texte"
    type="button"
    class="fr-btn fr-ml-2w"
    onclick={onClickAddAll}>Tout ajouter</button
  >
</div>
