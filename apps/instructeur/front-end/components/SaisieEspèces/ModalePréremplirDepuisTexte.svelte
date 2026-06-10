<script lang="ts">
  import EcranChampTexte from "./ModalePréremplirDepuisTexte/EcranChampTexte.svelte";
  import EcranPréciserImpact from "./ModalePréremplirDepuisTexte/EcranPréciserImpact.svelte";
  import TuileSaisieEspèce from "../SaisieEspèces/TuileSaisieEspèce.svelte";
  import { normalizeNomEspèce, normalizeTexteEspèce } from "@pitchou/common/manipulationStrings.ts";

  import type {
    ParClassification,
    EspèceProtégée,
    DescriptionImpact,
    ActivitéMenançante,
    MéthodeMenançante,
    MoyenDePoursuiteMenaçant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    référencesEspèces: TuileSaisieEspèce[];
    espècesProtégéesParClassification: ParClassification<EspèceProtégée[]>;
    onClickPréRemplirAvecDocumentTexte: (
      espècesImpactées: Array<{ espèce: EspèceProtégée; impacts: DescriptionImpact[] }>,
    ) => void;
    activitesParClassificationEtreVivant?: ParClassification<
      Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>
    >;
    méthodesParClassificationEtreVivant: ParClassification<
      Map<MéthodeMenançante["Code"], MéthodeMenançante>
    >;
    transportsParClassificationEtreVivant: ParClassification<
      Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
    >;
  };

  let {
    référencesEspèces = $bindable(),
    espècesProtégéesParClassification,
    onClickPréRemplirAvecDocumentTexte,
    méthodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
  }: Props = $props();

  const idModalePréremplirDepuisTexte = "modale-préremplir-depuis-texte";

  function chercherEspècesDansTexte(texte: string): Set<EspèceProtégée> {
    let espècesTrouvées: Set<EspèceProtégée> = new Set();

    for (const [nom, espClassif] of nomVersEspèceClassif) {
      if (texte.includes(nom)) {
        espècesTrouvées.add(espClassif);
      }
    }

    return espècesTrouvées;
  }

  let écranAffiché: "champTexte" | "préciserImpact" = $state("champTexte");

  let nomVersEspèceClassif = $derived(créerNomVersEspèceClassif(espècesProtégéesParClassification));

  /**
   * Texte saisi par l'utilisateur
   */
  let texteEspèces = $state("");

  /** Source de vérité : espèces trouvées dans le texte */
  let espècesTrouvéesDansTexte: Set<EspèceProtégée> = $derived(
    chercherEspècesDansTexte(normalizeTexteEspèce(texteEspèces)),
  );

  // Réinitialiser les espèces modifiables quand le texte change
  $effect(() => {
    réinitialiserEspècesImpactées(espècesTrouvéesDansTexte);
  });

  let espècesImpactéesPourPréremplir: Array<{
    espèce?: EspèceProtégée;
    impacts: DescriptionImpact[];
  }> = $state([]);

  async function supprimerEspèceImpactéeImpactée(indexEspèceÀSupprimer: number) {
    espècesImpactéesPourPréremplir.splice(indexEspèceÀSupprimer, 1);
  }

  function réinitialiserEspècesImpactées(nouvellesEspècesImpactées: Set<EspèceProtégée>) {
    let _espècesImpactées: Array<{ espèce: EspèceProtégée; impacts: DescriptionImpact[] }> = [];
    nouvellesEspècesImpactées.forEach((espèce) => {
      _espècesImpactées.push({ espèce, impacts: [{}] });
    });
    espècesImpactéesPourPréremplir = _espècesImpactées;
  }

  function préremplirAvecCesEspècesImpacts() {
    //@ts-ignore
    let nouvellesEspècesImpactées: Array<{
      espèce: EspèceProtégée;
      impacts: DescriptionImpact[];
    }> = espècesImpactéesPourPréremplir.filter(
      (espèceImpactée) => espèceImpactée?.espèce !== undefined,
    );

    onClickPréRemplirAvecDocumentTexte(nouvellesEspècesImpactées);
  }

  function ajouterImpactPourChaqueClassification(
    impactPourChaqueOiseau: DescriptionImpact,
    impactPourChaqueFauneNonOiseau: DescriptionImpact,
    impactPourChaqueFlore: DescriptionImpact,
  ) {
    espècesImpactéesPourPréremplir.forEach((espèceImpactée) => {
      if (espèceImpactée.espèce && espèceImpactée.espèce.classification === "oiseau") {
        espèceImpactée.impacts = [{ ...impactPourChaqueOiseau }];
      } else if (
        espèceImpactée.espèce &&
        espèceImpactée.espèce.classification === "faune non-oiseau"
      ) {
        espèceImpactée.impacts = [{ ...impactPourChaqueFauneNonOiseau }];
      } else if (espèceImpactée.espèce && espèceImpactée.espèce.classification === "flore") {
        espèceImpactée.impacts = [{ ...impactPourChaqueFlore }];
      }
    });
  }

  /**
   * Recheche "à l'arrache"
   */
  function créerNomVersEspèceClassif(
    espècesProtégéesParClassification: ParClassification<EspèceProtégée[]>,
  ): Map<string, EspèceProtégée> {
    const nomVersEspèceClassif: Map<string, EspèceProtégée> = new Map();

    for (const espèces of Object.values(espècesProtégéesParClassification)) {
      for (const espèce of espèces) {
        const { nomsScientifiques, nomsVernaculaires } = espèce;
        if (nomsScientifiques.size >= 1) {
          for (const nom of nomsScientifiques) {
            const normalized = normalizeNomEspèce(nom);
            if (normalized && normalized.length >= 3) {
              nomVersEspèceClassif.set(normalized, espèce);
            }
          }
        }

        if (nomsVernaculaires.size >= 1) {
          for (const nom of nomsVernaculaires) {
            const normalized = normalizeNomEspèce(nom);
            if (normalized && normalized.length >= 3) {
              nomVersEspèceClassif.set(normalized, espèce);
            }
          }
        }
      }
    }

    return nomVersEspèceClassif;
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
          {#if écranAffiché === "champTexte"}
            <EcranChampTexte
              bind:texteEspèces
              bind:espècesTrouvéesDansTexte
              bind:écranAffiché
              {espècesImpactéesPourPréremplir}
              {espècesProtégéesParClassification}
              {idModalePréremplirDepuisTexte}
              {préremplirAvecCesEspècesImpacts}
              supprimerEspèceImpactée={supprimerEspèceImpactéeImpactée}
            />
          {:else if écranAffiché === "préciserImpact"}
            <EcranPréciserImpact
              bind:écranAffiché
              {espècesImpactéesPourPréremplir}
              supprimerEspèceImpactée={supprimerEspèceImpactéeImpactée}
              {préremplirAvecCesEspècesImpacts}
              {ajouterImpactPourChaqueClassification}
              {méthodesParClassificationEtreVivant}
              {transportsParClassificationEtreVivant}
              {activitesParClassificationEtreVivant}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
</dialog>
