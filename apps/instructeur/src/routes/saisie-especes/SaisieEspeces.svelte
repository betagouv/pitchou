<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import EspecesProtegeesGroupeesParImpact from "$lib/components/EspecesProtegeesGroupeesParImpact.svelte";
  import ModalePreremplirDepuisTexte from "./SaisieEspeces/ModalePreremplirDepuisTexte.svelte";
  import FormSaisieEspece from "./SaisieEspeces/FormSaisieEspece.svelte";
  import { descriptionMenacesEspecesToOdsArrayBuffer } from "@pitchou/common/especesUtils.ts";
  import Loader from "$lib/components/Loader.svelte";
  import TuileSaisieEspece from "./SaisieEspeces/TuileSaisieEspece.svelte";
  import { tick } from "svelte";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";

  import type {
    ByClassification,
    EspeceProtegee,
    OiseauAtteint,
    FauneNonOiseauAtteinte,
    FloreAtteinte,
    ActiviteMenancante,
    MethodeMenancante,
    MoyenDePoursuiteMenacant,
    DescriptionMenacesEspeces,
    DescriptionImpact,
  } from "@pitchou/types/especes.d.ts";

  type Props = {
    espècesProtégéesParClassification: ByClassification<EspeceProtegee[]>;
    activitesParClassificationEtreVivant: ByClassification<
      Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>
    >;
    méthodesParClassificationEtreVivant: ByClassification<
      Map<MethodeMenancante["Code"], MethodeMenancante>
    >;
    transportsParClassificationEtreVivant: ByClassification<
      Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
    >;
    importDescriptionMenacesEspècesFromOds: (x: ArrayBuffer) => Promise<DescriptionMenacesEspeces>;
    oiseauxAtteints: OiseauAtteint[];
    faunesNonOiseauxAtteintes: FauneNonOiseauAtteinte[];
    floresAtteintes: FloreAtteinte[];
  };

  let {
    espècesProtégéesParClassification: especesProtegeesParClassification,
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant: methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
    importDescriptionMenacesEspècesFromOds: importDescriptionMenacesEspecesFromOds,
    oiseauxAtteints = $bindable(),
    faunesNonOiseauxAtteintes = $bindable(),
    floresAtteintes = $bindable(),
  }: Props = $props();

  let especesImpactees: Array<{ espèce?: EspeceProtegee; impacts?: DescriptionImpact[] }> = $state([
    { impacts: [{}] },
  ]);

  let nombreEspecesSaisies = $derived(especesImpactees.filter((espece) => !!espece.espèce).length);

  let fichierEspecesOds: File | undefined = $state();

  let messageErreurPreRemplirAvecDocumentOds: string | undefined = $state();

  let inputFileUpload: HTMLInputElement | undefined = $state();

  let modale: HTMLElement | undefined;

  let modeLecture = $state(false);

  let referencesEspeces: TuileSaisieEspece[] = $state([]);

  let especesImpacteesParClassification: DescriptionMenacesEspeces = $derived.by(() => {
    let especesImpacteesParClassification: DescriptionMenacesEspeces = {
      oiseau: [],
      "faune non-oiseau": [],
      flore: [],
    };

    for (const espece of especesImpactees) {
      for (const impact of espece.impacts ?? []) {
        if (espece.espèce) {
          const classification = espece.espèce.classification;
          especesImpacteesParClassification[classification].push({
            espèce: espece.espèce,
            ...impact,
          });
        }
      }
    }

    return especesImpacteesParClassification;
  });

  const promesseReferentiels = loadActivitesMethodesMoyensDePoursuite();

  function impactsParClassificationVerListeEspecesImpactees(
    descriptionMenacesEspeces: DescriptionMenacesEspeces,
  ) {
    const impactParEspeces: Map<
      EspeceProtegee["CD_REF"],
      { espèce?: EspeceProtegee; impacts?: DescriptionImpact[] }
    > = new Map();
    const especeParCD_REF = new Map();
    for (const classfication in descriptionMenacesEspeces) {
      const especes: Array<OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte> =
        (descriptionMenacesEspeces as any)[classfication] ?? [];

      for (const espece of especes) {
        const especeEtImpacts = impactParEspeces.get(espece.espèce.CD_REF) ?? {
          espèce: espece.espèce,
          impacts: [],
        };
        especeEtImpacts.impacts?.push(espece);
        impactParEspeces.set(espece.espèce.CD_REF, especeEtImpacts);
        especeParCD_REF.set(espece.espèce.CD_REF, espece);
      }
    }

    return [...impactParEspeces.values()];
  }

  async function creerOdsBlob() {
    const odsArrayBuffer = await descriptionMenacesEspecesToOdsArrayBuffer(
      especesImpacteesParClassification,
    );
    return new Blob([odsArrayBuffer], { type: "application/vnd.oasis.opendocument.spreadsheet" });
  }

  /**
   * Import data via file
   */

  /**
   * In a previous version, there was a bind:files on the input@type=file
   * But, presumably, there was a svelte bug that considered files changed when
   * other unrelated things changed in the page
   * So, we handle this with an 'input' event now rather than svelte's reactivity
   */
  async function onFileInput(e: Event & { currentTarget: HTMLElement & HTMLInputElement }) {
    messageErreurPreRemplirAvecDocumentOds = undefined;
    const files: FileList | null = e.currentTarget.files;
    fichierEspecesOds = (files && files[0]) || undefined;
  }

  async function onClickPreRemplirAvecDocumentOds() {
    try {
      if (!fichierEspecesOds) {
        throw new Error("Aucun fichier espèces .ods n'a été téléchargé.");
      }
      const descriptionMenacesEspeces = await fichierEspecesOds
        .arrayBuffer()
        .then(importDescriptionMenacesEspecesFromOds);

      if (Object.keys(descriptionMenacesEspeces).length >= 1) {
        especesImpactees =
          impactsParClassificationVerListeEspecesImpactees(descriptionMenacesEspeces);

        if (modale) {
          //@ts-ignore
          window.dsfr(modale).modal.conceal();
        }
      }
    } catch (erreur) {
      messageErreurPreRemplirAvecDocumentOds =
        "Une erreur est survenue au moment de cliquer sur le bouton Pré-remplir.";
      if (erreur instanceof Error) {
        if (erreur.cause === "format incorrect") {
          messageErreurPreRemplirAvecDocumentOds = `Le fichier ne respecte pas le format décrit dans <a href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods" target="_blank" rel="noopener external" title="documentation des fichiers d'espèces – nouvelle fenêtre">la documentation des fichiers d'espèces.</a>`;
        } else {
          messageErreurPreRemplirAvecDocumentOds = erreur.message;
        }
      }
      // Move focus to the file field in case of error
      if (inputFileUpload) {
        inputFileUpload.focus();
      }
      throw new Error(messageErreurPreRemplirAvecDocumentOds);
    }
  }

  async function onClickPreRemplirAvecDocumentTexte(
    especesImpacteesPourPreremplissage: Array<{
      espece: EspeceProtegee;
      impacts?: DescriptionImpact[];
    }>,
  ) {
    if (especesImpacteesPourPreremplissage.length >= 1) {
      especesImpactees = especesImpacteesPourPreremplissage;

      // The tick() is necessary to wait for the interface to update and allow focusing on the right reference
      await tick();

      referencesEspeces = referencesEspeces.filter((ref) => ref !== null);
      referencesEspeces[referencesEspeces.length - 1].focusEspeceForm();
    }
  }
</script>

<svelte:head>
  <title>Espèces protégées impactées — Pitchou</title>
</svelte:head>

<article>
  <header>
    <h1>Espèces protégées impactées</h1>

    <div class="fr-toggle">
      <input
        bind:checked={modeLecture}
        type="checkbox"
        class="fr-toggle__input"
        id="toggle-mode-lecture"
      />
      <label class="fr-toggle__label" for="toggle-mode-lecture"> Mode lecture </label>
    </div>

    <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
      {#if modeLecture}
        Mode lecture activé. Les espèces sont maintenant affichées regroupées par type d'impact.
      {:else}
        Mode lecture désactivé. Vous pouvez modifier les espèces et leurs impacts.
      {/if}
    </div>

    <!--
                This component with the fr-translate class is here so that we have a dropdown menu and the dsfr
                does not provide a more generic component for the moment
                This part should be revisited either with a component made by us
                or with a DSFR update if it one day contains a component that suits us
            -->
    <div class="fr-translate fr-nav">
      <div class="fr-nav__item">
        <button
          aria-controls="methodes-preremplissage"
          aria-expanded="false"
          title="Choisir une méthode de pré-remplissage"
          type="button"
          class="fr-btn fr-btn--tertiary"
        >
          Pré-remplir
        </button>
        <div class="fr-collapse fr-translate__menu fr-menu" id="methodes-preremplissage">
          <ul class="fr-menu__list">
            <li>
              <button
                class="fr-translate__language fr-btn fr-btn--secondary fr-nav__link"
                type="button"
                data-fr-opened="false"
                aria-controls="modale-préremplir-depuis-import">Importer un document .ods</button
              >
            </li>
            <li>
              <button
                class="fr-btn fr-btn--secondary fr-translate__language fr-nav__link"
                type="button"
                data-fr-opened="false"
                aria-controls="modale-préremplir-depuis-texte">Pré-remplir depuis un texte</button
              >
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>

  <div class="fr-grid-row">
    <div class="fr-col">
      <dialog
        bind:this={modale}
        id="modale-préremplir-depuis-import"
        class="fr-modal"
        aria-labelledby="modale-préremplir-depuis-import-title-avec-liste"
        aria-modal="true"
      >
        <div class="fr-container fr-container--fluid fr-container-md">
          <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-8 fr-col-lg-6">
              <div class="fr-modal__body">
                <div class="fr-modal__header">
                  <button
                    aria-controls="modale-préremplir-depuis-import"
                    title="Fermer"
                    type="button"
                    class="fr-btn--close fr-btn">Fermer</button
                  >
                </div>
                <div class="fr-modal__content">
                  <h2 id="modale-préremplir-depuis-import-title-avec-liste" class="fr-modal__title">
                    Pré-remplir avec une liste déjà réalisée
                  </h2>
                  <div class="fr-mb-4w">
                    <span class="fr-text--sm">
                      Vous pouvez choisir :
                      <ul>
                        <li>un document déjà généré avec cet outil</li>
                        <li>
                          un document .ods qui respecte le format décrit dans <a
                            href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods"
                            target="_blank"
                            rel="noopener external"
                            title="Lien vers la page qui renseigne sur le format d'un fichier espèces - nouvelle fenêtre"
                            class="fr-link fr-text--sm">la documentation des fichiers d'espèces</a
                          >
                        </li>
                      </ul>
                    </span>
                    <div
                      class="fr-upload-group fr-mt-6w"
                      class:fr-upload-group--error={messageErreurPreRemplirAvecDocumentOds}
                    >
                      <label class="fr-label" for="file-upload">
                        <span class="fr-hint-text">{uploadSizeHint()} Formats supportés : ods</span>
                      </label>
                      <input
                        bind:this={inputFileUpload}
                        aria-label="Importer un fichier d'espèces"
                        oninput={onFileInput}
                        class="fr-upload"
                        type="file"
                        accept=".ods"
                        id="file-upload"
                        name="file-upload"
                      />
                      <div class="fr-messages-group" id="file-upload-messages" aria-live="polite">
                        {#if messageErreurPreRemplirAvecDocumentOds}
                          <p
                            class="fr-message fr-message--error"
                            id="file-upload-message-error-format-incorrect"
                          >
                            {@html messageErreurPreRemplirAvecDocumentOds}
                          </p>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="fr-modal__footer">
                  <button class="fr-btn fr-ml-auto" onclick={onClickPreRemplirAvecDocumentOds}>
                    Pré-remplir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>

      <ModalePreremplirDepuisTexte
        bind:référencesEspèces={referencesEspeces}
        espècesProtégéesParClassification={especesProtegeesParClassification}
        onClickPréRemplirAvecDocumentTexte={onClickPreRemplirAvecDocumentTexte}
        méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
        {transportsParClassificationEtreVivant}
        {activitesParClassificationEtreVivant}
      />
    </div>
  </div>

  {#if modeLecture}
    {#if nombreEspecesSaisies === 0}
      <div class="fr-grid-row fr-mb-2w">
        <div class="fr-col">
          <div class="fr-alert fr-alert--warning">
            <p>Aucune espèce n'a encore été saisie.</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="fr-grid-row fr-mb-2w">
        <div class="fr-col">
          <div class="fr-alert fr-alert--info">
            <p>
              Mode lecture activé : les espèces sont affichées regroupées par type d'impact.
              Désactivez le mode lecture pour modifier les espèces.
            </p>
          </div>
        </div>
      </div>
      {#await promesseReferentiels}
        <Loader></Loader>
      {:then { identifiantPitchouVersActivitéEtImpactsQuantifiés: identifiantPitchouVersActiviteEtImpactsQuantifies }}
        <EspecesProtegeesGroupeesParImpact
          espècesImpactées={especesImpacteesParClassification}
          identifiantPitchouVersActivitéEtImpactsQuantifiés={identifiantPitchouVersActiviteEtImpactsQuantifies}
        />
      {/await}
    {/if}
  {:else}
    <FormSaisieEspece
      bind:espècesImpactées={especesImpactees}
      bind:référencesEspèces={referencesEspeces}
      espècesProtégées={[
        ...especesProtegeesParClassification["oiseau"],
        ...especesProtegeesParClassification["faune non-oiseau"],
        ...especesProtegeesParClassification["flore"],
      ]}
      {activitesParClassificationEtreVivant}
      méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
      {transportsParClassificationEtreVivant}
    />
  {/if}
  <footer class="fr-mb-4w">
    <button
      aria-controls="modale-validation-saisie"
      data-fr-opened="false"
      type="button"
      class="fr-btn fr-btn--lg fr-ml-auto">Valider ma saisie</button
    >
  </footer>
  <dialog
    id="modale-validation-saisie"
    class="fr-modal"
    aria-labelledby="modale-validation-saisie-title"
    data-fr-concealing-backdrop="true"
  >
    <div class="fr-container fr-container--fluid fr-container-md">
      <div class="fr-grid-row fr-grid-row--center">
        <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
          <div class="fr-modal__body">
            <div class="fr-modal__header"></div>
            <div class="fr-modal__content">
              <h2 id="modale-validation-saisie-title" class="fr-modal__title">
                Dernière étape : Ajouter votre saisie à votre dossier Démarche Numérique
              </h2>
              <ol id="liste-des-étapes-pour-ajouter-saisie-à-DS">
                <li>
                  <span class="fr-text--lg"
                    >Télécharger le document récapitulatif de votre saisie.</span
                  >
                  <div class="flex-justify-content-center">
                    <DownloadButton
                      classname="fr-btn fr-mt-4v"
                      label={`Télécharger le document récapitulatif (${nombreEspecesSaisies} espèce${nombreEspecesSaisies > 1 ? "s" : ""})`}
                      makeFilename={() =>
                        `especes-impactées-${new Date().toISOString().slice(0, "YYYY-MM-DD:HH-MM".length)}.ods`}
                      makeFileContentBlob={creerOdsBlob}
                    />
                  </div>
                </li>
                <li>
                  <span class="fr-text--lg"
                    >Ajouter le document récapitulatif dans votre dossier Démarche Numérique,
                    section "3. Espèces concernées par la dérogation".</span
                  >
                </li>
                <li>
                  <span class="fr-text--lg"
                    >Votre liste d'espèces protégées impactées sera liée à votre dossier.</span
                  >

                  <div class="fr-mt-1v fr-text--sm">
                    Une fois le document récapitulatif ajouté, vous pouvez fermer cette fenêtre.
                  </div>
                </li>
              </ol>
            </div>
            <div class="fr-modal__footer">
              <button
                aria-controls="modale-validation-saisie"
                title="Fermer"
                type="button"
                id="button-fermer-modale-validation-saisie"
                class="fr-btn fr-btn--secondary">Fermer la fenêtre</button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</article>

<style lang="scss">
  article {
    header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }

    #liste-des-étapes-pour-ajouter-saisie-à-DS {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    #button-fermer-modale-validation-saisie {
      margin-inline: auto;
    }

    .flex-justify-content-center {
      display: flex;
      justify-content: center;
    }

    footer {
      display: flex;
      justify-content: end;
    }

    #modale-préremplir-depuis-import {
      ul {
        list-style: "- ";
      }
    }

    #file-upload-message-error-format-incorrect {
      display: unset;
    }
    .fr-toggle {
      label {
        width: 100%;
      }
    }
  }
</style>
