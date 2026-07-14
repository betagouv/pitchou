<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { tick } from "svelte";
  import NomEspece from "../../NomEspece.svelte";
  import DeplierReplier from "$lib/components/common/DeplierReplier.svelte";
  import { mailtoJeNetrouvePasUneEspece } from "@pitchou/common/constantes.ts";

  import type {
    ParClassification,
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
    espècesProtégéesParClassification: ParClassification<EspeceProtegee[]>;
    idModalePréremplirDepuisTexte: string;
  };

  let {
    espècesTrouvéesDansTexte = $bindable(),
    texteEspèces: texteEspeces = $bindable(),
    écranAffiché = $bindable(),
    espècesImpactéesPourPréremplir: especesImpacteesPourPreremplir,
    idModalePréremplirDepuisTexte: idModalePreremplirDepuisTexte,
    préremplirAvecCesEspècesImpacts: preremplirAvecCesEspecesImpacts,
    supprimerEspèceImpactée: supprimerEspeceImpactee,
  }: Props = $props();

  //@ts-ignore
  let oiseauxAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "oiseau",
      ),
    ),
  );
  //@ts-ignore
  let fauneNonOiseauxAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "faune non-oiseau",
      ),
    ),
  );
  //@ts-ignore
  let floreAPreremplir: SvelteSet<EspeceProtegee> = $derived(
    new SvelteSet(
      [...especesImpacteesPourPreremplir.map((especeImpactee) => especeImpactee.espèce)].filter(
        (e) => e && e.classification === "flore",
      ),
    ),
  );

  /**
   * Array of references to the delete buttons, indexed by the index in espècesImpactéesPourPréremplir
   */
  let referencesBoutonsSupprimer: HTMLElement[] = $state([]);

  /**
   * Reference to the text field
   */
  let champTexte: HTMLTextAreaElement | undefined = $state();

  export function focusBoutonSupprimer() {
    const dernierBouton = referencesBoutonsSupprimer.filter((b) => b !== null).pop();
    dernierBouton?.focus();
  }

  function onClickpreciserImpact() {
    écranAffiché = "préciserImpact";
  }

  async function supprimerEspeceImpacteeDepuisClassification(espece: EspeceProtegee) {
    const indexDansListe = especesImpacteesPourPreremplir.findIndex(
      ({ espèce: especeImpactee }) => especeImpactee === espece,
    );
    if (indexDansListe >= 0) {
      supprimerEspeceImpactee(indexDansListe);

      await tick();

      if (especesImpacteesPourPreremplir.length === 0) {
        champTexte?.focus();
      } else {
        let indexAFocuser =
          indexDansListe === especesImpacteesPourPreremplir.length
            ? indexDansListe - 1
            : indexDansListe;

        let especeAFocus = especesImpacteesPourPreremplir[indexAFocuser]?.espèce;

        // Find the reference of the button corresponding to this espèce
        // We iterate over the references and check if the espèce at this index matches
        if (especeAFocus) {
          const boutonAFocus = referencesBoutonsSupprimer.find((ref, idx) => {
            // Check if the reference exists and if the espèce at this index matches
            return ref !== null && especesImpacteesPourPreremplir[idx]?.espèce === especeAFocus;
          });

          if (boutonAFocus) {
            boutonAFocus.focus();
          } else {
            // Fallback: focus on the text field if no button available
            champTexte?.focus();
          }
        } else {
          // Fallback: focus on the text field
          champTexte?.focus();
        }
      }
    }
  }
</script>

<div class="fr-modal__header">
  <button
    aria-controls={idModalePreremplirDepuisTexte}
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
        bind:this={champTexte}
        bind:value={texteEspeces}
        class="fr-input fr-mb-2w"
        rows="14"
        aria-labelledby="label-champ-texte-espece"
      ></textarea>
    </div>
    <div class="fr-col">
      <h3 class="fr-h6">Les espèces trouvées</h3>
      {#if texteEspeces !== "" && oiseauxAPreremplir.size === 0 && fauneNonOiseauxAPreremplir.size === 0 && floreAPreremplir.size === 0}
        Aucune espèce n'a été trouvée.
      {:else}
        {#if oiseauxAPreremplir.size >= 1}
          <section class="section-espèce-par-classification fr-mb-1w">
            <h4>
              {`${oiseauxAPreremplir.size} ${oiseauxAPreremplir.size >= 2 ? "oiseaux" : "oiseau"}`}
            </h4>
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
          </section>
        {/if}
        {#if fauneNonOiseauxAPreremplir.size >= 1}
          <section class="section-espèce-par-classification fr-mb-1w">
            <h4>
              {`${fauneNonOiseauxAPreremplir.size} ${fauneNonOiseauxAPreremplir.size >= 2 ? "faunes" : "faune"} non-oiseau`}
            </h4>
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
          </section>
        {/if}
        {#if floreAPreremplir.size >= 1}
          <section class="section-espèce-par-classification fr-mb-1w">
            <h4>{`${floreAPreremplir.size} ${floreAPreremplir.size >= 2 ? "flores" : "flore"}`}</h4>
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
          </section>
        {/if}
      {/if}
    </div>
  </div>
  <DeplierReplier>
    {#snippet summary()}
      Je ne trouve pas une espèce…
    {/snippet}
    {#snippet content()}
      <p class="fr-text--sm">
        Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci d'envoyer un
        mail à
        <a target="_blank" href={mailtoJeNetrouvePasUneEspece}>pitchou@beta.gouv.fr</a> en indiquant
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
  </DeplierReplier>
</div>
<div class="fr-modal__footer">
  <button type="button" class="fr-btn fr-btn--secondary fr-ml-auto" onclick={onClickpreciserImpact}
    >Préciser l'impact</button
  >
  <button
    aria-controls={idModalePreremplirDepuisTexte}
    type="button"
    class="fr-btn fr-ml-2w"
    onclick={preremplirAvecCesEspecesImpacts}
    >{`Ajouter ${especesImpacteesPourPreremplir.length} ${especesImpacteesPourPreremplir.length >= 2 ? "espèces" : "espèce"}`}</button
  >
</div>

<style>
  .section-espèce-par-classification {
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
