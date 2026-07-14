<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import NomEspece from "../../NomEspece.svelte";
  import ImpactEspece from "../ImpactEspece.svelte";
  import { tick } from "svelte";

  import type {
    EspeceProtegee,
    DescriptionImpact,
    ParClassification,
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
    activitesParClassificationEtreVivant?: ParClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ParClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ParClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
    ajouterImpactPourChaqueClassification: (
      impactPourChaqueOiseau: DescriptionImpact,
      impactPourChaqueFauneNonOiseau: DescriptionImpact,
      impactPourChaqueFlore: DescriptionImpact,
    ) => void;
  };

  let {
    écranAffiché: ecranAffiche = $bindable(),
    espècesImpactéesPourPréremplir: especesImpacteesPourPreremplir,
    supprimerEspèceImpactée: supprimerEspeceImpactee,
    préremplirAvecCesEspècesImpacts: preremplirAvecCesEspecesImpacts,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    activitesParClassificationEtreVivant,
    ajouterImpactPourChaqueClassification,
  }: Props = $props();

  let impactPourChaqueOiseau: DescriptionImpact = $state({});

  let impactPourChaqueFauneNonOiseau: DescriptionImpact = $state({});

  let impactPourChaqueFlore: DescriptionImpact = $state({});

  //@ts-ignore
  let oiseauxAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "oiseau",
      ),
    ),
  );
  //@ts-ignore
  let fauneNonOiseauxAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "faune non-oiseau",
      ),
    ),
  );
  //@ts-ignore
  let floreAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map(({ espèce: espece }) => espece)].filter(
        (e) => e && e.classification === "flore",
      ),
    ),
  );

  let titreModale: HTMLElement;

  /**
   * Reference to the back button
   */
  let boutonRetour: HTMLButtonElement | undefined = $state();

  /**
   * Array of references to the delete buttons, indexed by the index in espècesImpactéesPourPréremplir
   */
  let referencesBoutonsSupprimer: HTMLElement[] = $state([]);

  $effect.pre(() => {
    if (ecranAffiche === "préciserImpact") {
      tick().then(() => {
        titreModale.focus();
      });
    }
  });

  async function supprimerEspeceImpacteeDepuisClassification(espece: EspeceProtegee) {
    const indexDansListe = especesImpacteesPourPreremplir.findIndex(
      ({ espèce: especeImpactee }) => especeImpactee === espece,
    );
    if (indexDansListe >= 0) {
      supprimerEspeceImpactee(indexDansListe);

      await tick();

      if (especesImpacteesPourPreremplir.length === 0) {
        boutonRetour?.focus();
      } else {
        let indexAFocuser =
          indexDansListe === especesImpacteesPourPreremplir.length
            ? indexDansListe - 1
            : indexDansListe;

        let especeAFocus = especesImpacteesPourPreremplir[indexAFocuser]?.espèce;

        if (especeAFocus) {
          const boutonAFocus = referencesBoutonsSupprimer.find((ref, idx) => {
            // Check if the reference exists and if the espèce at this index matches
            return ref !== null && especesImpacteesPourPreremplir[idx]?.espèce === especeAFocus;
          });

          if (boutonAFocus) {
            boutonAFocus.focus();
          } else {
            // Fallback: focus on the back button
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
    preremplirAvecCesEspecesImpacts();
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
    {#if oiseauxAPreremplir.size === 0 && fauneNonOiseauxAPreremplir.size === 0 && floreAPreremplir.size === 0}
      Aucune espèce n'a été renseignée.
    {:else}
      {#if oiseauxAPreremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>
            {`${oiseauxAPreremplir.size} ${oiseauxAPreremplir.size >= 2 ? "oiseaux" : "oiseau"}`}
          </h3>
          <ul>
            {#each [...oiseauxAPreremplir] as espece (espece)}
              {@const indexDansListe = especesImpacteesPourPreremplir.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={referencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspeceImpacteeDepuisClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactPourChaqueOiseau}
            indexEspèce={0}
            espèceClassification={"oiseau"}
            {activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if fauneNonOiseauxAPreremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>
            {`${fauneNonOiseauxAPreremplir.size} ${fauneNonOiseauxAPreremplir.size >= 2 ? "faunes" : "faune"} non-oiseau`}
          </h3>
          <ul>
            {#each [...fauneNonOiseauxAPreremplir] as espece (espece)}
              {@const indexDansListe = especesImpacteesPourPreremplir.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={referencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspeceImpacteeDepuisClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactPourChaqueFauneNonOiseau}
            indexEspèce={1}
            espèceClassification={"faune non-oiseau"}
            {activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if floreAPreremplir.size >= 1}
        <section class="section-espèce-par-classification">
          <h3>{`${floreAPreremplir.size} ${floreAPreremplir.size >= 2 ? "flores" : "flore"}`}</h3>
          <ul>
            {#each [...floreAPreremplir] as espece (espece)}
              {@const indexDansListe = especesImpacteesPourPreremplir.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={referencesBoutonsSupprimer[indexDansListe]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => supprimerEspeceImpacteeDepuisClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactPourChaqueFlore}
            indexEspèce={2}
            espèceClassification={"flore"}
            {activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
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
    onclick={() => (ecranAffiche = "champTexte")}>Retour</button
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
