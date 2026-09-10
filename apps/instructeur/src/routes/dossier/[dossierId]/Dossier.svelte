<script lang="ts">
  import HeaderDossier from "./Dossier/HeaderDossier.svelte";
  import { onDestroy } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import DossierNotificationReadTracker from "$lib/components/DossierNotificationReadTracker.svelte";

  import DossierInstruction from "./Dossier/DossierInstruction.svelte";
  import DossierDetailProjet from "./Dossier/DossierDetailProjet.svelte";
  import DossierAvis from "./Dossier/DossierAvis.svelte";
  import DossierControles from "./Dossier/DossierControles.svelte";
  import DossierHistorique from "./Dossier/DossierHistorique.svelte";
  import DossierPiecesJointes from "./Dossier/DossierPiecesJointes.svelte";
  import DossierGenerationDocuments from "./Dossier/DossierGenerationDocuments.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import debounce from "just-debounce-it";
  import DossierTabList from "./Dossier/DossierTabList.svelte";
  import ReadOnlyBanner from "./Dossier/ReadOnlyBanner.svelte";
  import { visibleDossierTabs, type DossierTab } from "./Dossier/dossierTabs.ts";
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
    onClose: () => void;
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
    onClose,
  }: Props = $props();

  provideReadOnly(() => readOnly);

  const sendEvenementConsulterUnDossier = debounce(
    () => sendEvenement({ type: "consulterUnDossier", details: { dossierId: dossier.id } }),
    15 * 60 * 1000,
    true,
  );

  let updated = $state(false);
  let savedTimer: ReturnType<typeof setTimeout> | undefined;

  function onSaved() {
    clearTimeout(savedTimer);
    updated = true;
    savedTimer = setTimeout(() => (updated = false), 3000);
  }

  onDestroy(() => clearTimeout(savedTimer));

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
  <DossierNotificationReadTracker dossierId={dossier.id} {readOnly} />
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
      {updated}
      {onClose}
      onEnterReadOnly={() => onReadOnlyChange(true)}
    ></HeaderDossier>

    <div class="fr-tabs dossier-tabs">
      <DossierTabList
        {activeTab}
        onSelect={onTabChange}
        hasPendingChanges={!readOnly &&
          !!store.notificationByDossier.get(dossier.id)?.changes.length}
      />
      {#each visibleDossierTabs(readOnly) as tab (tab.id)}
        <div
          id="tabpanel-{tab.id}-panel"
          aria-labelledby="tabpanel-{tab.id}"
          class="fr-tabs__panel"
          class:fr-tabs__panel--selected={activeTab === tab.id}
          role="tabpanel"
          tabindex="0"
        >
          {#if tab.id === "instruction"}
            <DossierInstruction {dossier} {email} {onSaved} />
          {:else if tab.id === "detail-du-projet"}
            <DossierDetailProjet {dossier} {anomalies} {notification} />
          {:else if tab.id === "avis"}
            <DossierAvis {dossier} {email} followers={dossierFollowers} />
          {:else if tab.id === "controles"}
            <DossierControles {dossier} />
          {:else if tab.id === "historique"}
            {#if activeTab === "historique"}<DossierHistorique {dossier} />{/if}
          {:else if tab.id === "pieces-jointes"}
            <DossierPiecesJointes {dossier} openTab={onTabChange} />
          {:else if tab.id === "generation-document"}
            <DossierGenerationDocuments {dossier} />
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .fr-tabs {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    transition: none;
    overflow: visible;
    box-shadow: none;
    background-image: none;
  }

  .fr-tabs > :global(.fr-tabs__list) {
    grid-area: 1 / 1;
  }

  /* Size the full-bleed decoration to the panel, not DSFR's whole tab group.
     Clip only the decoration so dialogs can still cover the viewport. */
  .fr-tabs::before {
    grid-area: 2 / 1;
    height: auto;
    align-self: stretch;
    margin: 0;
    box-shadow: 0 0 0 100vmax var(--background-default-grey);
    clip-path: inset(0 -100vmax);
  }

  .fr-tabs__panel {
    grid-area: 2 / 1;
    left: 0;
    margin: 0;
    transition: none;
    transform: none;
    padding: 32px 0;
    background: var(--background-default-grey);
    border: 0;
    box-shadow: none;
  }

  /* Panels have no side padding, so the focus ring must sit outside their content. */
  .fr-tabs__panel:focus,
  .fr-tabs__panel:focus-visible {
    outline-offset: 2px;
  }

  /* Hidden panels must not size the row; keep their forms mounted. */
  .fr-tabs__panel:not(.fr-tabs__panel--selected) {
    display: none;
  }
</style>
