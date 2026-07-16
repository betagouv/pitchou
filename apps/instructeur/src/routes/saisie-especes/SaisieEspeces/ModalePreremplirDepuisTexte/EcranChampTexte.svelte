<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { tick } from "svelte";
  import NomEspece from "../../NomEspece.svelte";
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import { mailtoMissingEspece } from "@pitchou/common/constants.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    DescriptionImpact,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    espècesTrouvéesDansTexte: Set<EspeceProtegee>;
    texteEspèces: string;
    écranAffiché: "champTexte" | "préciserImpact";
    espècesImpactéesPourPréremplir: Array<{
      espèce?: EspeceProtegee;
      impacts: DescriptionImpact[];
    }>;
    préremplirAvecCesEspècesImpacts: () => void;
    supprimerEspèceImpactée: (indexEspeceASupprimer: number) => void;
    espècesProtégéesParClassification: ByClassification<EspeceProtegee[]>;
    idModalePréremplirDepuisTexte: string;
  };

  let {
    espècesTrouvéesDansTexte = $bindable(),
    texteEspèces: especesText = $bindable(),
    écranAffiché = $bindable(),
    espècesImpactéesPourPréremplir: especesImpacteesToPrefill,
    idModalePréremplirDepuisTexte: idModalPrefillFromText,
    préremplirAvecCesEspècesImpacts: prefillWithTheseEspecesImpacts,
    supprimerEspèceImpactée: removeEspeceImpactee,
  }: Props = $props();

  //@ts-ignore
  let oiseauxToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "oiseau",
      ),
    ),
  );
  //@ts-ignore
  let fauneNonOiseauxToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "faune non-oiseau",
      ),
    ),
  );
  //@ts-ignore
  let floreToPrefill: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesToPrefill.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "flore",
      ),
    ),
  );

  /**
   * Array of references to the delete buttons, indexed by the index in espècesImpactéesPourPréremplir
   */
  let deleteButtonRefs: HTMLElement[] = $state([]);

  /**
   * Reference to the text field
   */
  let textField: HTMLTextAreaElement | undefined = $state();

  export function focusBoutonSupprimer() {
    const lastButton = deleteButtonRefs.filter((b) => b !== null).pop();
    lastButton?.focus();
  }

  function onClickpreciserImpact() {
    écranAffiché = "préciserImpact";
  }

  async function removeEspeceImpacteeFromClassification(espece: EspeceProtegee) {
    const indexInList = especesImpacteesToPrefill.findIndex(
      ({ espèce: especeImpactee }) => especeImpactee === espece,
    );
    if (indexInList >= 0) {
      removeEspeceImpactee(indexInList);

      await tick();

      if (especesImpacteesToPrefill.length === 0) {
        textField?.focus();
      } else {
        let indexToFocus =
          indexInList === especesImpacteesToPrefill.length ? indexInList - 1 : indexInList;

        let especeToFocus = especesImpacteesToPrefill[indexToFocus]?.espèce;

        // Find the reference of the button corresponding to this espèce
        // We iterate over the references and check if the espèce at this index matches
        if (especeToFocus) {
          const buttonToFocus = deleteButtonRefs.find((ref, idx) => {
            // Check if the reference exists and if the espèce at this index matches
            return ref !== null && especesImpacteesToPrefill[idx]?.espèce === especeToFocus;
          });

          if (buttonToFocus) {
            buttonToFocus.focus();
          } else {
            // Fallback: focus on the text field if no button available
            textField?.focus();
          }
        } else {
          // Fallback: focus on the text field
          textField?.focus();
        }
      }
    }
  }
</script>

<div class="fr-modal__header">
  <button
    aria-controls={idModalPrefillFromText}
    title="Fermer"
    type="button"
    class="fr-btn--close fr-btn">Fermer</button
  >
</div>
<div class="fr-modal__content">
  <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
    Pré-remplissage des espèces protégées impactées
  </h2>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12 fr-col-sm">
      <h3 class="fr-h6" id="label-champ-texte-espece">Votre texte</h3>
      <textarea
        id={"champ-texte-espece"}
        bind:this={textField}
        bind:value={especesText}
        class="fr-input fr-mb-2w"
        rows="14"
        aria-labelledby="label-champ-texte-espece"
      ></textarea>
    </div>
    <div class="fr-col">
      <h3 class="fr-h6">Les espèces trouvées</h3>
      {#if especesText !== "" && oiseauxToPrefill.size === 0 && fauneNonOiseauxToPrefill.size === 0 && floreToPrefill.size === 0}
        Aucune espèce n'a été trouvée.
      {:else}
        {#if oiseauxToPrefill.size >= 1}
          <section class="section-espece-by-classification fr-mb-1w">
            <h4>
              {`${oiseauxToPrefill.size} ${oiseauxToPrefill.size >= 2 ? "oiseaux" : "oiseau"}`}
            </h4>
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
          </section>
        {/if}
        {#if fauneNonOiseauxToPrefill.size >= 1}
          <section class="section-espece-by-classification fr-mb-1w">
            <h4>
              {`${fauneNonOiseauxToPrefill.size} ${fauneNonOiseauxToPrefill.size >= 2 ? "faunes" : "faune"} non-oiseau`}
            </h4>
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
          </section>
        {/if}
        {#if floreToPrefill.size >= 1}
          <section class="section-espece-by-classification fr-mb-1w">
            <h4>{`${floreToPrefill.size} ${floreToPrefill.size >= 2 ? "flores" : "flore"}`}</h4>
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
          </section>
        {/if}
      {/if}
    </div>
  </div>
  <ExpandCollapse>
    {#snippet summary()}
      Je ne trouve pas une espèce…
    {/snippet}
    {#snippet content()}
      <p class="fr-text--sm">
        Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci d'envoyer un
        mail à
        <a target="_blank" href={mailtoMissingEspece}>pitchou@beta.gouv.fr</a> en indiquant
        l'espèce concernée (nom scientifique, nom vernaculaire, <code>CD_NOM</code>).<br />
        Le <code>CD_NOM</code> est disponible sur
        <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees"
          >le site de l'INPN</a
        >, en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br />
        Par exemple,
        <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221"
          >la Fauvette Pitchou a le <code>CD_NOM</code>
          <code>4221</code></a
        >.
      </p>
    {/snippet}
  </ExpandCollapse>
</div>
<div class="fr-modal__footer">
  <button type="button" class="fr-btn fr-btn--secondary fr-ml-auto" onclick={onClickpreciserImpact}
    >Préciser l'impact</button
  >
  <button
    aria-controls={idModalPrefillFromText}
    type="button"
    class="fr-btn fr-ml-2w"
    onclick={prefillWithTheseEspecesImpacts}
    >{`Ajouter ${especesImpacteesToPrefill.length} ${especesImpacteesToPrefill.length >= 2 ? "espèces" : "espèce"}`}</button
  >
</div>

<style>
  .section-espece-by-classification {
    ul {
      margin: 0;
      list-style: none;
    }
    li {
      padding: 0 !important;
      font-size: 0.9rem !important;
    }
    h4 {
      font-size: 1.125rem;
      margin-bottom: 0;
    }
  }
</style>
