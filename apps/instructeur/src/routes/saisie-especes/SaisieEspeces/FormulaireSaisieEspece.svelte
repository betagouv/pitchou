<script lang="ts">
  import { tick } from "svelte";
  import TuileSaisieEspece from "./TuileSaisieEspece.svelte";
  import { mailtoMissingEspece } from "@pitchou/common/constantes.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    DescriptionImpact,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    index?: number;
    espècesImpactées?: Array<{ espèce?: EspeceProtegee; impacts?: DescriptionImpact[] }>;
    espècesProtégées?: EspeceProtegee[];
    référencesEspèces: TuileSaisieEspece[];
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
    espècesImpactées: especesImpactees = $bindable([{ impacts: [{}] }]),
    référencesEspèces: referencesEspeces = $bindable(),
    espècesProtégées: especesProtegees = [],
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  }: Props = $props();

  async function ajouterEspece() {
    especesImpactees.push({
      impacts: [{}],
    });

    await tick();

    referencesEspeces = referencesEspeces.filter((ref) => ref !== null);
    referencesEspeces[referencesEspeces.length - 1].focusFormulaireEspece();
  }

  async function supprimerEspece(indexEspeceASupprimer: number) {
    especesImpactees.splice(indexEspeceASupprimer, 1);

    await tick();

    // When a reference disappears, it is set to "null" by Svelte and is not removed from the array
    referencesEspeces = referencesEspeces.filter((ref) => ref !== null);

    if (especesImpactees.length === 0) {
      await ajouterEspece();
    } else {
      let indexEspeceAFocus =
        indexEspeceASupprimer === especesImpactees.length
          ? especesImpactees.length - 1
          : indexEspeceASupprimer;

      referencesEspeces[indexEspeceAFocus].focusBoutonSupprimer();
    }
  }

  async function duppliquerEspece(indexEspeceADuppliquer: number) {
    const nouvelleEspeceImpactee = {
      espèce: especesImpactees[indexEspeceADuppliquer].espèce,
      impacts: especesImpactees[indexEspeceADuppliquer].impacts?.map((i) => Object.assign({}, i)),
    };
    especesImpactees.splice(indexEspeceADuppliquer + 1, 0, nouvelleEspeceImpactee);

    await tick();

    referencesEspeces = referencesEspeces.filter((ref) => ref !== null);

    referencesEspeces[indexEspeceADuppliquer + 1].reinitialiserEspece();
    referencesEspeces[indexEspeceADuppliquer + 1].focusFormulaireEspece();
  }

  function onOuvertureModale(e: Event) {
    // @ts-ignore EventTarget is an HTMLElement in this case
    modaleButton = e.target;
  }

  function onFermetureModale() {
    if (modaleButton) {
      modaleButton.focus();
    }
  }

  let modaleButton: HTMLElement | null;
</script>

<form class="fr-mb-4w">
  {#each especesImpactees as especesImpactee, indexEspecesImpactee (especesImpactee)}
    <TuileSaisieEspece
      bind:this={referencesEspeces[indexEspecesImpactee]}
      index={indexEspecesImpactee + 1}
      idModaleEspèceNonTrouvée="modale-je-ne-trouve-pas-une-espece"
      bind:espèce={especesImpactees[indexEspecesImpactee].espèce}
      bind:descriptionImpacts={especesImpactees[indexEspecesImpactee].impacts}
      {onOuvertureModale}
      onSuprimerEspèce={async () => {
        await supprimerEspece(indexEspecesImpactee);
      }}
      onDupliquerEspèce={async () => {
        await duppliquerEspece(indexEspecesImpactee);
      }}
      espècesProtégées={especesProtegees}
      {activitesParClassificationEtreVivant}
      méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
      {transportsParClassificationEtreVivant}
    />
  {/each}

  <div class="fr-grid-row">
    <button class="fr-btn fr-btn--secondary fr-m-auto" type="button" onclick={ajouterEspece}>
      Ajouter une espèce
    </button>
  </div>
</form>

<dialog
  id="modale-je-ne-trouve-pas-une-espece"
  class="fr-modal"
  aria-labelledby="modale-je-ne-trouve-pas-une-espece-title"
  data-fr-concealing-backdrop="true"
>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button
              aria-controls="modale-je-ne-trouve-pas-une-espece"
              title="Fermer"
              type="button"
              class="fr-btn--close fr-btn"
              onclick={onFermetureModale}>Fermer</button
            >
          </div>
          <div class="fr-modal__content">
            <h2 id="modale-je-ne-trouve-pas-une-espece" class="fr-modal__title">
              Je ne trouve pas une espèce que je veux saisir
            </h2>
            <p class="fr-callout__text">
              Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci
              d'envoyer un mail à
              <a target="_blank" href={mailtoMissingEspece}>pitchou@beta.gouv.fr</a> en
              indiquant l'espèce concernée (nom scientifique, nom vernaculaire,
              <code>CD_NOM</code>).<br />
              Le <code>CD_NOM</code> est disponible sur
              <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees"
                >le site de l'INPN</a
              >, en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br
              />
              Par exemple,
              <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221"
                >la Fauvette Pitchou a le <code>CD_NOM</code>
                <code>4221</code></a
              >.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
