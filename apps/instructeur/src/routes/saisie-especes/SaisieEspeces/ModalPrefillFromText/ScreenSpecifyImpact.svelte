<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import NomEspece from "../../NomEspece.svelte";
  import ImpactEspece from "../ImpactEspece.svelte";
  import { tick } from "svelte";

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
    const indexInList = especesImpacteesToPrefill.findIndex(
      ({ espèce: especeImpactee }) => especeImpactee === espece,
    );
    if (indexInList >= 0) {
      removeEspeceImpactee(indexInList);

      await tick();

      if (especesImpacteesToPrefill.length === 0) {
        backButton?.focus();
      } else {
        let indexToFocus =
          indexInList === especesImpacteesToPrefill.length ? indexInList - 1 : indexInList;

        let especeToFocus = especesImpacteesToPrefill[indexToFocus]?.espèce;

        if (especeToFocus) {
          const buttonToFocus = deleteButtonRefs.find((ref, idx) => {
            // Check if the reference exists and if the espèce at this index matches
            return ref !== null && especesImpacteesToPrefill[idx]?.espèce === especeToFocus;
          });

          if (buttonToFocus) {
            buttonToFocus.focus();
          } else {
            // Fallback: focus on the back button
            backButton?.focus;
          }
        } else {
          // Fallback : focus sur le bouton Retour
          backButton?.focus;
        }
      }
    }
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
      {#if oiseauxToPrefill.size >= 1}
        <section class="section-espece-by-classification">
          <h3>
            {`${oiseauxToPrefill.size} ${oiseauxToPrefill.size >= 2 ? "oiseaux" : "oiseau"}`}
          </h3>
          <ul>
            {#each [...oiseauxToPrefill] as espece (espece)}
              {@const indexInList = especesImpacteesToPrefill.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={deleteButtonRefs[indexInList]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => removeEspeceImpacteeFromClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactForEachOiseau}
            indexEspèce={0}
            espèceClassification={"oiseau"}
            {activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if fauneNonOiseauxToPrefill.size >= 1}
        <section class="section-espece-by-classification">
          <h3>
            {`${fauneNonOiseauxToPrefill.size} ${fauneNonOiseauxToPrefill.size >= 2 ? "faunes" : "faune"} non-oiseau`}
          </h3>
          <ul>
            {#each [...fauneNonOiseauxToPrefill] as espece (espece)}
              {@const indexInList = especesImpacteesToPrefill.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={deleteButtonRefs[indexInList]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => removeEspeceImpacteeFromClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactForEachFauneNonOiseau}
            indexEspèce={1}
            espèceClassification={"faune non-oiseau"}
            {activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
            {transportsParClassificationEtreVivant}
          />
        </section>
      {/if}
      {#if floreToPrefill.size >= 1}
        <section class="section-espece-by-classification">
          <h3>{`${floreToPrefill.size} ${floreToPrefill.size >= 2 ? "flores" : "flore"}`}</h3>
          <ul>
            {#each [...floreToPrefill] as espece (espece)}
              {@const indexInList = especesImpacteesToPrefill.findIndex(
                ({ espèce: especeImpactee }) => especeImpactee === espece,
              )}
              <li>
                <NomEspece espèce={espece} />
                <button
                  bind:this={deleteButtonRefs[indexInList]}
                  type="button"
                  class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
                  onclick={() => removeEspeceImpacteeFromClassification(espece)}
                >
                  Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
                </button>
              </li>
            {/each}
          </ul>
          <ImpactEspece
            bind:impact={impactForEachFlore}
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

<style>
  .section-espece-by-classification {
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
