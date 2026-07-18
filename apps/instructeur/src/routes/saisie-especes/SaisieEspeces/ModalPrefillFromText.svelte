<script lang="ts">
  import ScreenFieldText from "./ModalPrefillFromText/ScreenFieldText.svelte";
  import ScreenSpecifyImpact from "./ModalPrefillFromText/ScreenSpecifyImpact.svelte";
  import TileSaisieEspece from "./TileSaisieEspece.svelte";
  import { normalizeEspeceName, normalizeEspeceText } from "@pitchou/common/stringManipulation.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    DescriptionImpact,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    référencesEspèces: TileSaisieEspece[];
    espècesProtégéesParClassification: ByClassification<EspeceProtegee[]>;
    onClickPréRemplirAvecDocumentTexte: (
      especesImpactees: Array<{ espece: EspeceProtegee; impacts: DescriptionImpact[] }>,
    ) => void;
    activitesParClassificationEtreVivant?: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ByClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ByClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
  };

  let {
    référencesEspèces = $bindable(),
    espècesProtégéesParClassification: especesProtegeesParClassification,
    onClickPréRemplirAvecDocumentTexte: onClickPrefillWithTextDocument,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
  }: Props = $props();

  const idModalPrefillFromText = "modale-préremplir-depuis-texte";

  function searchEspecesInText(text: string): Set<EspeceProtegee> {
    let foundEspeces: Set<EspeceProtegee> = new Set();

    for (const [name, espClassif] of nameToEspeceClassif) {
      if (text.includes(name)) {
        foundEspeces.add(espClassif);
      }
    }

    return foundEspeces;
  }

  let displayedScreen: "champTexte" | "préciserImpact" = $state("champTexte");

  let nameToEspeceClassif = $derived(createNameToEspeceClassif(especesProtegeesParClassification));

  /**
   * Text entered by the user
   */
  let especesText = $state("");

  /** Source of truth: espèces found in the text */
  let especesFoundInText: Set<EspeceProtegee> = $derived(
    searchEspecesInText(normalizeEspeceText(especesText)),
  );

  // Reset the editable espèces when the text changes
  $effect(() => {
    resetEspecesImpactees(especesFoundInText);
  });

  let especesImpacteesToPrefill: Array<{
    espèce?: EspeceProtegee;
    impacts: DescriptionImpact[];
  }> = $state([]);

  async function removeEspeceImpactee(indexEspeceToRemove: number) {
    especesImpacteesToPrefill.splice(indexEspeceToRemove, 1);
  }

  function resetEspecesImpactees(newEspecesImpactees: Set<EspeceProtegee>) {
    let _especesImpactees: Array<{ espèce: EspeceProtegee; impacts: DescriptionImpact[] }> = [];
    newEspecesImpactees.forEach((espece) => {
      _especesImpactees.push({ espèce: espece, impacts: [{}] });
    });
    especesImpacteesToPrefill = _especesImpactees;
  }

  function prefillWithTheseEspecesImpacts() {
    //@ts-ignore
    let newEspecesImpactees: Array<{
      espece: EspeceProtegee;
      impacts: DescriptionImpact[];
    }> = especesImpacteesToPrefill.filter((especeImpactee) => especeImpactee?.espèce !== undefined);

    onClickPrefillWithTextDocument(newEspecesImpactees);
  }

  function addImpactForEachClassification(
    impactForEachOiseau: DescriptionImpact,
    impactForEachFauneNonOiseau: DescriptionImpact,
    impactForEachFlore: DescriptionImpact,
  ) {
    especesImpacteesToPrefill.forEach((especeImpactee) => {
      if (especeImpactee.espèce && especeImpactee.espèce.classification === "oiseau") {
        especeImpactee.impacts = [{ ...impactForEachOiseau }];
      } else if (
        especeImpactee.espèce &&
        especeImpactee.espèce.classification === "faune non-oiseau"
      ) {
        especeImpactee.impacts = [{ ...impactForEachFauneNonOiseau }];
      } else if (especeImpactee.espèce && especeImpactee.espèce.classification === "flore") {
        especeImpactee.impacts = [{ ...impactForEachFlore }];
      }
    });
  }

  /**
   * Quick and dirty search
   */
  function createNameToEspeceClassif(
    especesProtegeesParClassification: ByClassification<EspeceProtegee[]>,
  ): Map<string, EspeceProtegee> {
    const nameToEspeceClassif: Map<string, EspeceProtegee> = new Map();

    for (const especes of Object.values(especesProtegeesParClassification)) {
      for (const espece of especes) {
        const { nomsScientifiques, nomsVernaculaires } = espece;
        if (nomsScientifiques.size >= 1) {
          for (const name of nomsScientifiques) {
            const normalized = normalizeEspeceName(name);
            if (normalized && normalized.length >= 3) {
              nameToEspeceClassif.set(normalized, espece);
            }
          }
        }

        if (nomsVernaculaires.size >= 1) {
          for (const name of nomsVernaculaires) {
            const normalized = normalizeEspeceName(name);
            if (normalized && normalized.length >= 3) {
              nameToEspeceClassif.set(normalized, espece);
            }
          }
        }
      }
    }

    return nameToEspeceClassif;
  }
</script>

<dialog
  id="modale-préremplir-depuis-texte"
  class="fr-modal"
  aria-label="Pré-remplissage des espèces protégées impactées"
  aria-modal="true"
  data-fr-concealing-backdrop="false"
>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          {#if displayedScreen === "champTexte"}
            <ScreenFieldText
              bind:texteEspèces={especesText}
              bind:espècesTrouvéesDansTexte={especesFoundInText}
              bind:écranAffiché={displayedScreen}
              espècesImpactéesPourPréremplir={especesImpacteesToPrefill}
              espècesProtégéesParClassification={especesProtegeesParClassification}
              idModalePréremplirDepuisTexte={idModalPrefillFromText}
              préremplirAvecCesEspècesImpacts={prefillWithTheseEspecesImpacts}
              supprimerEspèceImpactée={removeEspeceImpactee}
            />
          {:else if displayedScreen === "préciserImpact"}
            <ScreenSpecifyImpact
              bind:écranAffiché={displayedScreen}
              espècesImpactéesPourPréremplir={especesImpacteesToPrefill}
              supprimerEspèceImpactée={removeEspeceImpactee}
              préremplirAvecCesEspècesImpacts={prefillWithTheseEspecesImpacts}
              {addImpactForEachClassification}
              méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
              {transportsParClassificationEtreVivant}
              {activitesParClassificationEtreVivant}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
</dialog>
