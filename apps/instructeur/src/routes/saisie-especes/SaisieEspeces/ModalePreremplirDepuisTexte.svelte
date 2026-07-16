<script lang="ts">
  import EcranChampTexte from "./ModalePreremplirDepuisTexte/EcranChampTexte.svelte";
  import EcranPreciserImpact from "./ModalePreremplirDepuisTexte/EcranPreciserImpact.svelte";
  import TuileSaisieEspece from "./TuileSaisieEspece.svelte";
  import { normalizeEspeceName, normalizeEspeceText } from "@pitchou/common/manipulationStrings.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    DescriptionImpact,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    référencesEspèces: TuileSaisieEspece[];
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
    onClickPréRemplirAvecDocumentTexte: onClickPreRemplirAvecDocumentTexte,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
  }: Props = $props();

  const idModalePreremplirDepuisTexte = "modale-préremplir-depuis-texte";

  function chercherEspecesDansTexte(texte: string): Set<EspeceProtegee> {
    let especesTrouvees: Set<EspeceProtegee> = new Set();

    for (const [nom, espClassif] of nomVersEspeceClassif) {
      if (texte.includes(nom)) {
        especesTrouvees.add(espClassif);
      }
    }

    return especesTrouvees;
  }

  let ecranAffiche: "champTexte" | "préciserImpact" = $state("champTexte");

  let nomVersEspeceClassif = $derived(creerNomVersEspeceClassif(especesProtegeesParClassification));

  /**
   * Text entered by the user
   */
  let texteEspeces = $state("");

  /** Source of truth: espèces found in the text */
  let especesTrouveesDansTexte: Set<EspeceProtegee> = $derived(
    chercherEspecesDansTexte(normalizeEspeceText(texteEspeces)),
  );

  // Reset the editable espèces when the text changes
  $effect(() => {
    reinitialiserEspecesImpactees(especesTrouveesDansTexte);
  });

  let especesImpacteesPourPreremplir: Array<{
    espèce?: EspeceProtegee;
    impacts: DescriptionImpact[];
  }> = $state([]);

  async function supprimerEspeceImpacteeImpactee(indexEspeceASupprimer: number) {
    especesImpacteesPourPreremplir.splice(indexEspeceASupprimer, 1);
  }

  function reinitialiserEspecesImpactees(nouvellesEspecesImpactees: Set<EspeceProtegee>) {
    let _especesImpactees: Array<{ espèce: EspeceProtegee; impacts: DescriptionImpact[] }> = [];
    nouvellesEspecesImpactees.forEach((espece) => {
      _especesImpactees.push({ espèce: espece, impacts: [{}] });
    });
    especesImpacteesPourPreremplir = _especesImpactees;
  }

  function preremplirAvecCesEspecesImpacts() {
    //@ts-ignore
    let nouvellesEspecesImpactees: Array<{
      espece: EspeceProtegee;
      impacts: DescriptionImpact[];
    }> = especesImpacteesPourPreremplir.filter(
      (especeImpactee) => especeImpactee?.espèce !== undefined,
    );

    onClickPreRemplirAvecDocumentTexte(nouvellesEspecesImpactees);
  }

  function ajouterImpactPourChaqueClassification(
    impactPourChaqueOiseau: DescriptionImpact,
    impactPourChaqueFauneNonOiseau: DescriptionImpact,
    impactPourChaqueFlore: DescriptionImpact,
  ) {
    especesImpacteesPourPreremplir.forEach((especeImpactee) => {
      if (especeImpactee.espèce && especeImpactee.espèce.classification === "oiseau") {
        especeImpactee.impacts = [{ ...impactPourChaqueOiseau }];
      } else if (
        especeImpactee.espèce &&
        especeImpactee.espèce.classification === "faune non-oiseau"
      ) {
        especeImpactee.impacts = [{ ...impactPourChaqueFauneNonOiseau }];
      } else if (especeImpactee.espèce && especeImpactee.espèce.classification === "flore") {
        especeImpactee.impacts = [{ ...impactPourChaqueFlore }];
      }
    });
  }

  /**
   * Quick and dirty search
   */
  function creerNomVersEspeceClassif(
    especesProtegeesParClassification: ByClassification<EspeceProtegee[]>,
  ): Map<string, EspeceProtegee> {
    const nomVersEspeceClassif: Map<string, EspeceProtegee> = new Map();

    for (const especes of Object.values(especesProtegeesParClassification)) {
      for (const espece of especes) {
        const { nomsScientifiques, nomsVernaculaires } = espece;
        if (nomsScientifiques.size >= 1) {
          for (const nom of nomsScientifiques) {
            const normalized = normalizeEspeceName(nom);
            if (normalized && normalized.length >= 3) {
              nomVersEspeceClassif.set(normalized, espece);
            }
          }
        }

        if (nomsVernaculaires.size >= 1) {
          for (const nom of nomsVernaculaires) {
            const normalized = normalizeEspeceName(nom);
            if (normalized && normalized.length >= 3) {
              nomVersEspeceClassif.set(normalized, espece);
            }
          }
        }
      }
    }

    return nomVersEspeceClassif;
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
          {#if ecranAffiche === "champTexte"}
            <EcranChampTexte
              bind:texteEspèces={texteEspeces}
              bind:espècesTrouvéesDansTexte={especesTrouveesDansTexte}
              bind:écranAffiché={ecranAffiche}
              espècesImpactéesPourPréremplir={especesImpacteesPourPreremplir}
              espècesProtégéesParClassification={especesProtegeesParClassification}
              idModalePréremplirDepuisTexte={idModalePreremplirDepuisTexte}
              préremplirAvecCesEspècesImpacts={preremplirAvecCesEspecesImpacts}
              supprimerEspèceImpactée={supprimerEspeceImpacteeImpactee}
            />
          {:else if ecranAffiche === "préciserImpact"}
            <EcranPreciserImpact
              bind:écranAffiché={ecranAffiche}
              espècesImpactéesPourPréremplir={especesImpacteesPourPreremplir}
              supprimerEspèceImpactée={supprimerEspeceImpacteeImpactee}
              préremplirAvecCesEspècesImpacts={preremplirAvecCesEspecesImpacts}
              {ajouterImpactPourChaqueClassification}
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
