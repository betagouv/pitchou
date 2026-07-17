<script lang="ts">
  import HeaderDossier from "./Dossier/HeaderDossier.svelte";

  import DossierMessagerie from "./Dossier/DossierMessagerie.svelte";
  import DossierInstruction from "./Dossier/DossierInstruction.svelte";
  import DossierProjet from "./Dossier/DossierProjet.svelte";
  import DossierPorteurDeProjet from "./Dossier/DossierPorteurDeProjet.svelte";
  import DossierAvis from "./Dossier/DossierAvis.svelte";
  import DossierControles from "./Dossier/DossierControles.svelte";
  import DossierPiecesJointes from "./Dossier/DossierPiecesJointes.svelte";
  import DossierGenerationDocuments from "./Dossier/DossierGenerationDocuments.svelte";
  import { MediaTypeError } from "@pitchou/common/errors.ts";
  import { especesImpacteesFromFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import debounce from "just-debounce-it";
  import { onMount } from "svelte";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Tab =
    | "instruction"
    | "projet"
    | "porteur-de-projet"
    | "avis"
    | "controles"
    | "pieces-jointes"
    | "generation-document"
    | "echanges";

  function changeTab(newTab: Tab) {
    activeTab = newTab;
    // Update the URL without reloading the page
    window.history.replaceState(null, "", `#${newTab}`);
  }

  function handleTabClick(tab: Tab) {
    changeTab(tab);
  }

  // Petitionnaires may upload the impacted-espece file as .ods (Pitchou's
  // template) or as .xlsx; both are parsed by espècesImpactéesDepuisFichierOdsArrayBuffer.
  const EXTENSIONS_ATTENDUES = [".ods", ".xlsx"];

  function getEspecesImpactes(
    dossier: DossierFull,
  ): ReturnType<typeof especesImpacteesFromFichierOdsArrayBuffer> | undefined {
    const especesImpactees = dossier.espècesImpactées;

    if (!especesImpactees || !especesImpactees.url) {
      return undefined;
    }

    const extension = "." + especesImpactees.nom?.split(".").pop();

    if (!EXTENSIONS_ATTENDUES.includes(extension)) {
      return Promise.reject(
        new MediaTypeError({ expected: EXTENSIONS_ATTENDUES.join(", "), obtained: extension }),
      );
    }

    // The file content is fetched on demand from the Object Storage
    return fetch(especesImpactees.url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => especesImpacteesFromFichierOdsArrayBuffer(arrayBuffer));
  }

  type Props = {
    dossier: DossierFull;
    initialActiveTab: Tab;
    messages: any;
    email: string;
    personnesQuiSuiventDossier: NonNullable<Personne["email"]>[];
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
    notification?: Pick<Notification, "vue" | "date_dernière_mise_à_jour">;
  };

  let {
    dossier,
    initialActiveTab,
    messages,
    email,
    personnesQuiSuiventDossier,
    currentDossierFollowedByCurrentInstructeur,
    notification,
  }: Props = $props();

  $inspect("Dossier complet", dossier);

  const sendEvenementConsulterUnDossier = debounce(
    () => sendEvenement({ type: "consulterUnDossier", détails: { dossierId: dossier.id } }),
    15 * 60 * 1000,
    true,
  );

  onMount(() => {
    if (notification?.vue === false) {
      // When the dossier has a notification not seen by the current instructrice,
      // it disappears when the dossier is consulted.
      updateNotificationForDossier({ dossier: dossier.id, vue: true });
    }
  });

  $effect(() => {
    if (activeTab === "projet") {
      sendEvenementConsulterUnDossier();
    }
  });

  let activeTab = $derived(initialActiveTab);

  let especesImpactees: Promise<DescriptionMenacesEspeces> | undefined = $derived(
    getEspecesImpactes(dossier),
  );
</script>

<svelte:head>
  <title
    >{`${dossier.nom} — Dossier n°${dossier.number_demarches_simplifiées ?? "non renseigné"} — Pitchou`}</title
  >
</svelte:head>

<div class="fr-grid-row fr-mt-2w">
  <div class="fr-col">
    <HeaderDossier {dossier} {currentDossierFollowedByCurrentInstructeur} {email}></HeaderDossier>

    <div class="fr-tabs">
      <ul class="fr-tabs__list" role="tablist" aria-label="Navigation des onglets du dossier">
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-instruction"
            aria-controls="tabpanel-instruction-panel"
            class="fr-tabs__tab {activeTab === 'instruction' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "instruction" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "instruction"}
            onclick={() => handleTabClick("instruction")}
          >
            Instruction
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-projet"
            aria-controls="tabpanel-projet-panel"
            class="fr-tabs__tab {activeTab === 'projet' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "projet" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "projet"}
            onclick={() => handleTabClick("projet")}
          >
            Projet
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-porteur-de-projet"
            aria-controls="tabpanel-porteur-de-projet-panel"
            class="fr-tabs__tab {activeTab === 'porteur-de-projet'
              ? 'fr-tabs__tab--selected'
              : ''}"
            tabindex={activeTab === "porteur-de-projet" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "porteur-de-projet"}
            onclick={() => handleTabClick("porteur-de-projet")}
          >
            Porteur de projet
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-echanges"
            aria-controls="tabpanel-echanges-panel"
            class="fr-tabs__tab {activeTab === 'echanges' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "echanges" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "echanges"}
            onclick={() => handleTabClick("echanges")}
          >
            Échanges
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-avis"
            aria-controls="tabpanel-avis-panel"
            class="fr-tabs__tab {activeTab === 'avis' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "avis" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "avis"}
            onclick={() => handleTabClick("avis")}
          >
            Avis
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-controles"
            aria-controls="tabpanel-controles-panel"
            class="fr-tabs__tab {activeTab === 'controles' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "controles" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "controles"}
            onclick={() => handleTabClick("controles")}
          >
            Controles
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-pieces-jointes"
            aria-controls="tabpanel-pieces-jointes-panel"
            class="fr-tabs__tab {activeTab === 'pieces-jointes' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={activeTab === "pieces-jointes" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "pieces-jointes"}
            onclick={() => handleTabClick("pieces-jointes")}
          >
            Pièces jointes
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-generation-document"
            aria-controls="tabpanel-generation-document-panel"
            class="fr-tabs__tab {activeTab === 'generation-document'
              ? 'fr-tabs__tab--selected'
              : ''}"
            tabindex={activeTab === "generation-document" ? 0 : -1}
            role="tab"
            aria-selected={activeTab === "generation-document"}
            onclick={() => handleTabClick("generation-document")}
          >
            Génération document
          </button>
        </li>
      </ul>
      <div
        id="tabpanel-instruction-panel"
        aria-labelledby="tabpanel-instruction"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "instruction"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierInstruction
          {dossier}
          {personnesQuiSuiventDossier}
          {currentDossierFollowedByCurrentInstructeur}
          {email}
        ></DossierInstruction>
      </div>
      <div
        id="tabpanel-projet-panel"
        aria-labelledby="tabpanel-projet"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "projet"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierProjet {dossier} espècesImpactées={especesImpactees}></DossierProjet>
      </div>
      <div
        id="tabpanel-porteur-de-projet-panel"
        aria-labelledby="tabpanel-porteur-de-projet"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "porteur-de-projet"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierPorteurDeProjet {dossier}></DossierPorteurDeProjet>
      </div>
      <div
        id="tabpanel-echanges-panel"
        aria-labelledby="tabpanel-echanges"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "echanges"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierMessagerie {dossier} {messages}></DossierMessagerie>
      </div>
      <div
        id="tabpanel-avis-panel"
        aria-labelledby="tabpanel-avis"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "avis"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierAvis {dossier}></DossierAvis>
      </div>
      <div
        id="tabpanel-controles-panel"
        aria-labelledby="tabpanel-controles"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "controles"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierControles {dossier}></DossierControles>
      </div>
      <div
        id="tabpanel-pieces-jointes-panel"
        aria-labelledby="tabpanel-pieces-jointes"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "pieces-jointes"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierPiecesJointes {dossier} openTab={changeTab}></DossierPiecesJointes>
      </div>
      <div
        id="tabpanel-generation-document-panel"
        aria-labelledby="tabpanel-generation-document"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "generation-document"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierGenerationDocuments {dossier} espècesImpactées={especesImpactees}
        ></DossierGenerationDocuments>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
</style>
