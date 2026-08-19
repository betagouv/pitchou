<script lang="ts">
  import HeaderDossier from "./Dossier/HeaderDossier.svelte";

  import DossierInstruction from "./Dossier/DossierInstruction.svelte";
  import DossierDetailProjet from "./Dossier/DossierDetailProjet.svelte";
  import DossierAvis from "./Dossier/DossierAvis.svelte";
  import DossierControles from "./Dossier/DossierControles.svelte";
  import DossierHistorique from "./Dossier/DossierHistorique.svelte";
  import DossierPiecesJointes from "./Dossier/DossierPiecesJointes.svelte";
  import DossierGenerationDocuments from "./Dossier/DossierGenerationDocuments.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import debounce from "just-debounce-it";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";
  import DossierTabList from "./Dossier/DossierTabList.svelte";
  import type { DossierTab } from "./Dossier/dossierTabs.ts";
  import { loadEspecesImpactees } from "./Dossier/loadEspecesImpactees.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Props = {
    dossier: DossierFull;
    activeTab: DossierTab;
    onTabChange: (tab: DossierTab) => void;
    email: string;
    dossierFollowers: NonNullable<Personne["email"]>[];
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
    notification?: Pick<Notification, "viewed" | "updated_at" | "viewed_at">;
  };

  let {
    dossier,
    activeTab,
    onTabChange,
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

  // Marking a dossier unread from the header must survive staying on the page,
  // so the automatic marking below is suspended after a manual action.
  let manuallyMarkedUnread = $state(false);

  $effect(() => {
    if (notification?.viewed === false && !manuallyMarkedUnread) {
      // When the dossier has a notification not seen by the current instructrice,
      // it disappears — but only after the instructrice stayed a few seconds, so
      // a quick glance keeps the dossier unread.
      const timer = setTimeout(() => {
        void updateNotificationForDossier({ dossier: dossier.id, viewed: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  });

  function setDossierRead(viewed: boolean) {
    manuallyMarkedUnread = !viewed;
    void updateNotificationForDossier({ dossier: dossier.id, viewed });
  }

  $effect(() => {
    if (activeTab === "detail-du-projet") {
      sendEvenementConsulterUnDossier();
    }
  });

  let especesImpactees: Promise<DescriptionMenacesEspeces> | undefined = $derived(
    loadEspecesImpactees(dossier),
  );
</script>

<svelte:head>
  <title
    >{`${dossier.name} — Dossier n°${dossier.demarche_numerique_number ?? dossier.id} — Pitchou`}</title
  >
</svelte:head>

<div class="fr-grid-row fr-mt-2w">
  <!-- min-w-0 lets the column shrink below its content width (long title, wide
       tab bar) instead of forcing the page to scroll horizontally. -->
  <div class="fr-col min-w-0">
    <HeaderDossier
      {dossier}
      {currentDossierFollowedByCurrentInstructeur}
      {email}
      {dossierFollowers}
      {notification}
      onSetRead={setDossierRead}
    ></HeaderDossier>

    <div class="fr-tabs">
      <DossierTabList {activeTab} onSelect={onTabChange} />
      <div
        id="tabpanel-detail-du-projet-panel"
        aria-labelledby="tabpanel-detail-du-projet"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "detail-du-projet"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierDetailProjet {dossier} {especesImpactees} {notification}></DossierDetailProjet>
      </div>
      <div
        id="tabpanel-instruction-panel"
        aria-labelledby="tabpanel-instruction"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "instruction"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierInstruction {dossier} {email}></DossierInstruction>
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
        id="tabpanel-historique-panel"
        aria-labelledby="tabpanel-historique"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "historique"}
        role="tabpanel"
        tabindex="0"
      >
        {#if activeTab === "historique"}
          <DossierHistorique {dossier}></DossierHistorique>
        {/if}
      </div>
      <div
        id="tabpanel-pieces-jointes-panel"
        aria-labelledby="tabpanel-pieces-jointes"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "pieces-jointes"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierPiecesJointes {dossier} openTab={onTabChange}></DossierPiecesJointes>
      </div>
      <div
        id="tabpanel-generation-document-panel"
        aria-labelledby="tabpanel-generation-document"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={activeTab === "generation-document"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierGenerationDocuments {dossier} {especesImpactees}></DossierGenerationDocuments>
      </div>
    </div>
  </div>
</div>
