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
  import ReadOnlyBanner from "./Dossier/ReadOnlyBanner.svelte";
  import type { DossierTab } from "./Dossier/dossierTabs.ts";
  import { provideReadOnly } from "./Dossier/readOnly.ts";
  import { anomaliesFichierEspeces } from "./Dossier/anomaliesFichierEspeces.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
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
    /** Hides every action writing to the dossier, the current user included. */
    readOnly: boolean;
    onReadOnlyChange: (readOnly: boolean) => void;
    /**
     * Whether the current user may edit this dossier at all. Read-only mode
     * looks the same for everyone, so only the way back out depends on it.
     */
    canEdit: boolean;
  };

  let {
    dossier,
    activeTab,
    onTabChange,
    email,
    dossierFollowers,
    currentDossierFollowedByCurrentInstructeur,
    notification,
    readOnly,
    onReadOnlyChange,
    canEdit,
  }: Props = $props();

  provideReadOnly(() => readOnly);

  const sendEvenementConsulterUnDossier = debounce(
    () => sendEvenement({ type: "consulterUnDossier", details: { dossierId: dossier.id } }),
    15 * 60 * 1000,
    true,
  );

  // Marking a dossier unread from the header must survive staying on the page,
  // so the automatic marking below is suspended after a manual action.
  let manuallyMarkedUnread = $state(false);

  $effect(() => {
    // Consulting in read-only mode leaves the dossier untouched, so it must not
    // consume the notification either.
    if (notification?.viewed === false && !manuallyMarkedUnread && !readOnly) {
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
  <!-- min-w-0 lets the column shrink below its content width (long title, wide
       tab bar) instead of forcing the page to scroll horizontally. -->
  <div class="fr-col min-w-0">
    {#if readOnly}
      <ReadOnlyBanner onLeave={canEdit ? () => onReadOnlyChange(false) : undefined} />
    {/if}

    <HeaderDossier
      {dossier}
      {currentDossierFollowedByCurrentInstructeur}
      {email}
      {dossierFollowers}
      {notification}
      onSetRead={setDossierRead}
      onEnterReadOnly={() => onReadOnlyChange(true)}
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
        <DossierDetailProjet {dossier} {anomalies} {notification}></DossierDetailProjet>
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
        <DossierAvis {dossier} {email} followers={dossierFollowers}></DossierAvis>
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
      <!-- The historique and the document generator are hidden in read-only
           mode: their panels are not rendered at all, not merely unreachable. -->
      {#if !readOnly}
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
      {/if}
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
      {#if !readOnly}
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
      {/if}
    </div>
  </div>
</div>
