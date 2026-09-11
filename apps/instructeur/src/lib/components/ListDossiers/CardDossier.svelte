<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import { formatLocalisation } from "$lib/dossier/displayDossier.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import TagEcheance from "$lib/components/TagEcheance.svelte";
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
  import DossierNotificationBadges from "$lib/components/DossierNotificationBadges.svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import { dossierIsFollowed } from "./filtering.ts";
  import { applicantName } from "./presentation.ts";
  import PhaseProgress from "./PhaseProgress.svelte";
  import { PROJECT_GRID, TILE_GRID } from "./rowLayout.ts";

  type Props = {
    dossier: DossierSummary;
    currentInstructeurFollowsDossier: (id: Dossier["id"]) => Promise<void>;
    currentInstructeurLeavesDossier: (id: Dossier["id"]) => Promise<void>;
    notificationViewed: boolean;
    dossierFollowedByCurrentInstructeur: boolean;
    readOnly?: boolean;
    onEditDueDate?: () => void;
  };

  let {
    dossier,
    dossierFollowedByCurrentInstructeur,
    currentInstructeurFollowsDossier,
    currentInstructeurLeavesDossier,
    notificationViewed,
    readOnly = false,
    onEditDueDate,
  }: Props = $props();

  const name = $derived(dossier.name || "(nom non renseigné)");

  const canEdit = $derived(dossier.access === "complet" && !readOnly);
  const unread = $derived(canEdit && notificationViewed === false);
  const followed = $derived(dossierIsFollowed(dossier.id, store.followRelations));
  const porteurDeProjet = $derived(applicantName(dossier));
  const localisation = $derived(formatLocalisation(dossier) || "(non renseignée)");
</script>

<!-- `relative` anchors the overlay that makes the whole tile open the dossier. -->
<div
  class="{TILE_GRID} dossier-card relative fr-px-2w fr-py-2w lg:px-2! xl:px-4! lg:items-center"
  class:unread
  data-testid="card-dossier"
>
  <div class={PROJECT_GRID}>
    {#if !canEdit}
      <span class="fr-icon-lock-line fr-icon--sm w-8 text-center" aria-label="Lecture seule"></span>
    {:else if dossierFollowedByCurrentInstructeur}
      <button
        type="button"
        class="follow-button fr-btn fr-icon-star-fill fr-btn--tertiary-no-outline fr-btn--sm relative z-10"
        onclick={() => currentInstructeurLeavesDossier(dossier.id)}
      >
        Ne plus suivre
      </button>
    {:else}
      <button
        type="button"
        class="follow-button fr-btn fr-icon-star-line fr-btn--tertiary-no-outline fr-btn--sm relative z-10"
        onclick={() => currentInstructeurFollowsDossier(dossier.id)}
      >
        Suivre
      </button>
    {/if}

    <span class="shrink-0 lg:self-center">
      <ActiviteIcon mainActivite={dossier.main_activite} size="size-8" />
    </span>

    <div class="min-w-0">
      <h4 class="dossier-text fr-mb-0">
        <!-- The link stretches over the whole tile, so a click anywhere opens the
             dossier while the page keeps a single, properly named link. Controls
             that do something else sit above it. -->
        <a
          href={`/dossier/${dossier.id}${canEdit ? "" : "?lecture=1"}`}
          class="project-title fr-link block truncate text-[color:var(--text-title-grey)] after:absolute after:inset-0 after:content-[''] {unread
            ? 'font-bold'
            : 'font-normal'}"
          title={name}
        >
          {name}
        </a>
      </h4>
      {#if dossier.enjeu}
        <p class="enjeu-badge fr-badge fr-badge--sm fr-badge--no-icon fr-mt-1w">Dossier à enjeu</p>
      {/if}
    </div>
  </div>

  <div class="min-w-0">
    <p
      class="dossier-text fr-mb-0 truncate {unread ? 'font-bold' : 'font-normal'}"
      title={porteurDeProjet}
    >
      <span class="fr-sr-only">Pétitionnaire&nbsp;:</span>
      {porteurDeProjet}
    </p>
    <p
      class="dossier-text fr-mb-0 flex min-w-0 items-center gap-1 text-[color:var(--text-mention-grey)]"
    >
      <span class="fr-icon-map-pin-2-line fr-icon--sm flex-none" aria-hidden="true"></span>
      <span class="fr-sr-only">Localisation&nbsp;:</span>
      <span class="truncate" title={localisation}>{localisation}</span>
    </p>
  </div>

  <PhaseProgress phase={dossier.phase} {unread} />

  <div class="min-w-0">
    <span class="fr-sr-only">Prochaine action attendue de&nbsp;:</span>
    <p class="dossier-text fr-mb-0 {unread ? 'font-bold' : 'font-normal'}">
      {dossier.next_action_expected_from === "Instructeur" && dossierFollowedByCurrentInstructeur
        ? "Moi"
        : dossier.next_action_expected_from || "(non renseignée)"}
    </p>
  </div>

  <div class="flex min-w-0 flex-col items-start gap-2 [overflow-wrap:anywhere] [&>*]:max-w-full">
    {#if canEdit}<DossierNotificationBadges dossierId={dossier.id} />{/if}
    {#if canEdit && !followed}
      <p class="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--purple-glycine">
        Sans instructeur-ice
      </p>
    {/if}
    <TagEcheance dueDate={dossier.next_due_date} />
  </div>

  <div class="relative z-10 flex flex-none flex-row items-start justify-end">
    {#if canEdit}<DossierActionsMenu
        dossierId={dossier.id}
        dossierName={dossier.name}
        {onEditDueDate}
      />{/if}
  </div>
</div>

<style>
  .dossier-card {
    border: 1px solid var(--border-default-grey, #ddd);
    border-radius: 4px;
    background: #f6f6f6;
    transition:
      border-color 150ms,
      box-shadow 150ms;
  }

  .dossier-card:hover {
    border-color: var(--border-plain-grey, #929292);
    box-shadow: 0 2px 6px #00000029;
  }

  .dossier-card.unread {
    border-color: var(--border-plain-grey, #929292);
    background: #fff;
  }

  .dossier-card.unread:hover {
    border-color: var(--text-default-grey, #3a3a3a);
  }

  .follow-button {
    color: var(--blue-france-main-525, #6a6af4);
    width: 2rem;
    height: 2rem;
  }

  .follow-button::before {
    --icon-size: 1.5rem;
    width: 1.5rem;
    height: 1.5rem;
  }

  .dossier-text,
  .project-title {
    font-size: 0.875rem;
    line-height: 1.5rem;
  }

  .dossier-card:has(:global([aria-haspopup="menu"][aria-expanded="true"])) {
    z-index: 20;
  }

  .project-title {
    text-decoration: none;
    background-image: none;
    --underline-img: none;
  }

  .enjeu-badge {
    background: var(--background-contrast-blue-france, #ececfe);
    color: var(--blue-france-main-525, #6a6af4);
  }
</style>
