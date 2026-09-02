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
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import debounce from "just-debounce-it";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";
  import DossierTabList from "./Dossier/DossierTabList.svelte";
  import type { DossierTab } from "./Dossier/dossierTabs.ts";
  import { anomaliesFichierEspeces } from "./Dossier/anomaliesFichierEspeces.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  function changeTab(newTab: DossierTab) {
    activeTab = newTab;
    // Update the URL without reloading the page
    window.history.replaceState(null, "", `#${newTab}`);
  }

  function handleTabClick(tab: DossierTab) {
    changeTab(tab);
  }

  type Props = {
    dossier: DossierFull;
    initialActiveTab: DossierTab;
    messages: any;
    email: string;
    dossierFollowers: NonNullable<Personne["email"]>[];
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
    notification?: Pick<Notification, "viewed" | "updated_at">;
  };

  let {
    dossier,
    initialActiveTab,
    messages,
    email,
    dossierFollowers,
    currentDossierFollowedByCurrentInstructeur,
    notification,
  }: Props = $props();

  const sendEvenementConsulterUnDossier = debounce(
    () => sendEvenement({ type: "consulterUnDossier", details: { dossierId: dossier.id } }),
    15 * 60 * 1000,
    true,
  );

  $effect(() => {
    if (notification?.viewed === false) {
      // When the dossier has a notification not seen by the current instructrice,
      // it disappears when the dossier is consulted.
      void updateNotificationForDossier({ dossier: dossier.id, viewed: true });
    }
  });

  $effect(() => {
    if (activeTab === "projet") {
      sendEvenementConsulterUnDossier();
    }
  });

  let activeTab = $derived(initialActiveTab);

  let anomalies: Promise<AnomalieFichierEspeces[]> | undefined = $derived(
    anomaliesFichierEspeces(dossier),
  );
</script>

<svelte:head>
  <title
    >{`${dossier.name} — Dossier n°${dossier.demarche_numerique_number ?? dossier.id} — Pitchou`}</title
  >
</svelte:head>

<div class="fr-grid-row fr-mt-2w">
  <div class="fr-col">
    <HeaderDossier {dossier} {currentDossierFollowedByCurrentInstructeur} {email}></HeaderDossier>

    <div class="fr-tabs">
      <DossierTabList {activeTab} onSelect={handleTabClick} />
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
          {dossierFollowers}
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
        <DossierProjet {dossier} {anomalies}></DossierProjet>
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
        <DossierAvis {dossier} {email} followers={dossierFollowers} {especesImpactees}
        ></DossierAvis>
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
        <DossierGenerationDocuments {dossier}></DossierGenerationDocuments>
      </div>
    </div>
  </div>
</div>
