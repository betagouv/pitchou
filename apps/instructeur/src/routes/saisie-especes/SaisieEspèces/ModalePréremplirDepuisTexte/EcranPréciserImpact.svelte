<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import NomEspèce from "../../NomEspèce.svelte";
  import ImpactEspèce from "../ImpactEspèce.svelte";
  import { tick } from "svelte";

  import type {
    EspèceProtégée,
    DescriptionImpact,
    ParClassification,
    ActivitéMenançante,
    MéthodeMenançante,
    MoyenDePoursuiteMenaçant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    écranAffiché: "champTexte" | "préciserImpact";
    espècesImpactéesPourPréremplir: Array<{
      espèce?: EspèceProtégée;
      impacts: DescriptionImpact[];
    }>;
    supprimerEspèceImpactée: (indexEspèceÀSupprimer: number) => Promise<void>;
    préremplirAvecCesEspècesImpacts: () => void;
    activitesParClassificationEtreVivant?: ParClassification<
      Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>
    >;
    méthodesParClassificationEtreVivant: ParClassification<
      Map<MéthodeMenançante["Code"], MéthodeMenançante>
    >;
    transportsParClassificationEtreVivant: ParClassification<
      Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
    >;
    ajouterImpactPourChaqueClassification: (
      impactPourChaqueOiseau: DescriptionImpact,
      impactPourChaqueFauneNonOiseau: DescriptionImpact,
      impactPourChaqueFlore: DescriptionImpact,
    ) => void;
  };

  let {
    écranAffiché = $bindable(),
    espècesImpactéesPourPréremplir,
    supprimerEspèceImpactée,
    préremplirAvecCesEspècesImpacts,
    méthodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
    ajouterImpactPourChaqueClassification,
  }: Props = $props();

  let impactPourChaqueOiseau: DescriptionImpact = $state({});

  let impactPourChaqueFauneNonOiseau: DescriptionImpact = $state({});

  let impactPourChaqueFlore: DescriptionImpact = $state({});

  //@ts-ignore
  let oiseauxÀPréremplir: SvelteSet<EspèceProtégée> = $derived(
    new SvelteSet(
      [...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(
        (e) => e && e.classification === "oiseau",
      ),
    ),
  );
  //@ts-ignore
  let fauneNonOiseauxÀPréremplir: SvelteSet<EspèceProtégée> = $derived(
    new SvelteSet(
      [...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(
        (e) => e && e.classification === "faune non-oiseau",
      ),
    ),
  );
  //@ts-ignore
  let floreÀPréremplir: SvelteSet<EspèceProtégée> = $derived(
    new SvelteSet(
      [...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(
        (e) => e && e.classification === "flore",
      ),
    ),
  );

  let titreModale: HTMLElement;

  /**
   * Référence vers le bouton retour
   */
  let boutonRetour: HTMLButtonElement | undefined = $state();

  /**
   * Tableau de références vers les boutons de suppression, indexé par l'index dans espècesImpactéesPourPréremplir
   */
  let référencesBoutonsSupprimer: HTMLElement[] = $state([]);

  $effect.pre(() => {
    if (écranAffiché === "préciserImpact") {
      tick().then(() => {
        titreModale.focus();
      });
    }
  });

  async function supprimerEspèceImpactéeDepuisClassification(espèce: EspèceProtégée) {
    const indexDansListe = espècesImpactéesPourPréremplir.findIndex(
      ({ espèce: espèceImpactée }) => espèceImpactée === espèce,
    );
    if (indexDansListe >= 0) {
      supprimerEspèceImpactée(indexDansListe);

      await tick();

      if (espècesImpactéesPourPréremplir.length === 0) {
        boutonRetour?.focus();
      } else {
        let indexAFocuser =
          indexDansListe === espècesImpactéesPourPréremplir.length
            ? indexDansListe - 1
            : indexDansListe;

        let espèceÀFocus = espècesImpactéesPourPréremplir[indexAFocuser]?.espèce;

        if (espèceÀFocus) {
          const boutonÀFocus = référencesBoutonsSupprimer.find((ref, idx) => {
            // Vérifier si la référence existe et si l'espèce à cet index correspond
            return ref !== null && espècesImpactéesPourPréremplir[idx]?.espèce === espèceÀFocus;
          });

          if (boutonÀFocus) {
            boutonÀFocus.focus();
          } else {
            // Fallback : focus sur le bouton Retour
            boutonRetour?.focus;
          }
        } else {
          // Fallback : focus sur le bouton Retour
          boutonRetour?.focus;
        }
      }
    }
  }

  function onClickToutAjouter() {
    ajouterImpactPourChaqueClassification(
      impactPourChaqueOiseau,
      impactPourChaqueFauneNonOiseau,
      impactPourChaqueFlore,
    );
    préremplirAvecCesEspècesImpacts();
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
    bind:this={titreModale}
    id="modale-préremplir-depuis-texte-title"
    class="fr-modal__title"
    tabindex="-1"
  >
    Préciser l'impact pour chaque type d'espèce
  </h2>
  <div>
    {#if oiseauxÀPréremplir.size === 0 && fauneNonOiseauxÀPréremplir.size === 0 && floreÀPréremplir.size === 0}
      Aucune espèce n'a été renseignée.
    {:else}
      {#if oiseauxÀPréremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>
            {`${oiseauxÀPréremplir.size} ${oiseauxÀPréremplir.size >= 2 ? "oiseaux" : "oiseau"}`}
          </h3>
          <ul>
            {#each [...oiseauxÀPréremplir] as espèce (espèce)}
              {@const indexDansListe = espècesImpactéesPourPréremplir.findIndex(
                ({ espèce: espèceImpactée }) => espèceImpactée === espèce,
              )}
              <li>
                <NomEspèce {espèce} />
                <button
                  bind:this={référencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}
                >
                  Supprimer l'espèce {[...espèce.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspèce
            bind:impact={impactPourChaqueOiseau}
            indexEspèce={0}
            espèceClassification={"oiseau"}
            {activitesParClassificationEtreVivant}
            {méthodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if fauneNonOiseauxÀPréremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>
            {`${fauneNonOiseauxÀPréremplir.size} ${fauneNonOiseauxÀPréremplir.size >= 2 ? "faunes" : "faune"} non-oiseau`}
          </h3>
          <ul>
            {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
              {@const indexDansListe = espècesImpactéesPourPréremplir.findIndex(
                ({ espèce: espèceImpactée }) => espèceImpactée === espèce,
              )}
              <li>
                <NomEspèce {espèce} />
                <button
                  bind:this={référencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}
                >
                  Supprimer l'espèce {[...espèce.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspèce
            bind:impact={impactPourChaqueFauneNonOiseau}
            indexEspèce={1}
            espèceClassification={"faune non-oiseau"}
            {activitesParClassificationEtreVivant}
            {méthodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if floreÀPréremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>{`${floreÀPréremplir.size} ${floreÀPréremplir.size >= 2 ? "flores" : "flore"}`}</h3>
          <ul>
            {#each [...floreÀPréremplir] as espèce (espèce)}
              {@const indexDansListe = espècesImpactéesPourPréremplir.findIndex(
                ({ espèce: espèceImpactée }) => espèceImpactée === espèce,
              )}
              <li>
                <NomEspèce {espèce} />
                <button
                  bind:this={référencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}
                >
                  Supprimer l'espèce {[...espèce.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspèce
            bind:impact={impactPourChaqueFlore}
            indexEspèce={2}
            espèceClassification={"flore"}
            {activitesParClassificationEtreVivant}
            {méthodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
    {/if}
  </div>
</div>

<div class="fr-modal__footer">
  <button
    bind:this={boutonRetour}
    type="button"
    class="fr-btn fr-btn--secondary fr-ml-auto"
    onclick={() => (écranAffiché = "champTexte")}>Retour</button
  >
  <button
    aria-controls="modale-préremplir-depuis-texte"
    type="button"
    class="fr-btn fr-ml-2w"
    onclick={onClickToutAjouter}>Tout ajouter</button
  >
</div>

<style>
  .section-espèce-par-classification {
    margin-bottom: 2rem;
    h3 {
      margin-bottom: 0.75rem;
      font-size: 1.25rem;
    }
    ul {
      margin: 0;
      margin-bottom: 2rem;
      list-style: none;
    }
    li {
      padding: 0 !important;
      font-size: 0.9rem !important;
    }
  }
</style>
