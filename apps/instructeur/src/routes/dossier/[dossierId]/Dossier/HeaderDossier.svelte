<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import { formatDistanceToNow } from "date-fns";
  import { fr } from "date-fns/locale";

  import { formatLocalisation } from "$lib/dossier/displayDossier.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import TagEcheance from "$lib/components/TagEcheance.svelte";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
  import AssignDossierFollowersModal from "$lib/components/DossierFollowerAssignment/AssignDossierFollowersModal.svelte";
  import ModalLectureSeule from "./ModalLectureSeule.svelte";

  import {
    instructeurLeavesDossier,
    instructeurFollowsDossier,
  } from "$lib/dossier/suiviDossier.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    currentDossierFollowedByCurrentInstructeur: boolean | undefined;
    dossierFollowers: NonNullable<Personne["email"]>[];
    notification?: Pick<Notification, "viewed" | "updated_at" | "viewed_at">;
    /** Marks the dossier read/unread for the current instructeur. */
    onSetRead: (viewed: boolean) => void;
  };

  let {
    dossier,
    email,
    currentDossierFollowedByCurrentInstructeur,
    dossierFollowers,
    notification,
    onSetRead,
  }: Props = $props();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-entete";

  let followersModalOpen = $state(false);
  let lectureSeuleModalOpen = $state(false);

  const unread = $derived(notification?.viewed === false);

  // "Modifié il y a 2 jours" when the notification carries the change date,
  // plain "Nouveauté" otherwise.
  const nouveauteLabel = $derived(
    notification?.updated_at
      ? `Modifié ${formatDistanceToNow(notification.updated_at, { addSuffix: true, locale: fr })}`
      : "Nouveauté",
  );

  // Long titles step down in size so the header keeps a stable height.
  const titleClass = $derived(
    !dossier.name || dossier.name.length <= 50
      ? "text-[1.75rem]"
      : dossier.name.length <= 90
        ? "text-[1.5rem]"
        : "text-[1.25rem]",
  );

  const followersLabel = $derived(
    dossierFollowers.length === 0
      ? "Suivi par 0 personne"
      : dossierFollowers.length === 1
        ? `Suivi par ${dossierFollowers[0]}`
        : `Suivi par ${dossierFollowers.length} personnes`,
  );

  function openPieceJointeModal() {
    sendEvenement({
      type: "ouvrirModaleAjouterPieceJointe",
      details: { dossierId: dossier.id, source: "enteteDossier" },
    });
    const modalElement = document.getElementById(idModalAddPieceJointe);
    // @ts-ignore DSFR installs this browser global.
    if (modalElement) window.dsfr(modalElement).modal.disclose();
  }

  // Track whether we reached this dossier through in-app navigation (`from` is
  // non-null). If so, the close button returns to the browser's previous page.
  // Otherwise (direct access to the dossier), redirect to the relevant list.
  let navigatedFromApp = $state(false);

  afterNavigate(({ from }) => {
    if (from) navigatedFromApp = true;
  });

  function closeDossier() {
    if (navigatedFromApp) {
      history.back();
    } else {
      goto(currentDossierFollowedByCurrentInstructeur ? "/mes-dossiers" : "/tous-les-dossiers");
    }
  }
</script>

<header class="fr-mb-2w fr-mt-1w">
  <div class="flex justify-end">
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
      onclick={closeDossier}
    >
      Fermer le dossier
    </button>
  </div>

  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
    <ActiviteIcon mainActivite={dossier.main_activite} size="size-24 lg:size-28" />

    <div class="flex min-w-0 grow flex-col gap-2">
      {#if dossier.enjeu || unread || dossier.next_due_date}
        <div class="flex flex-wrap items-center gap-2">
          {#if dossier.enjeu}
            <p class="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--purple-glycine fr-mb-0">
              Dossier à enjeu
            </p>
          {/if}
          {#if unread}
            <p class="fr-badge fr-badge--sm fr-badge--new fr-mb-0">{nouveauteLabel}</p>
          {/if}
          <TagEcheance dueDate={dossier.next_due_date} />
        </div>
      {/if}

      <h1 class="fr-mb-0 {titleClass} leading-[1.3] text-[color:var(--text-title-grey)]">
        {dossier.name}
      </h1>

      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p class="fr-mb-0 flex items-center gap-2">
          <span
            class="fr-icon-map-pin-2-fill fr-icon--sm flex-none text-[color:var(--text-mention-grey)]"
            aria-hidden="true"
          ></span>
          {formatLocalisation(dossier)}
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="fr-link fr-text--sm max-w-[16rem] truncate"
            onclick={() => (followersModalOpen = true)}
          >
            {followersLabel}
          </button>

          {#if typeof currentDossierFollowedByCurrentInstructeur === "boolean"}
            {#if currentDossierFollowedByCurrentInstructeur}
              <button
                onclick={() => instructeurLeavesDossier(email, dossier.id)}
                class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
                >Vous suivez ce dossier</button
              >
            {:else}
              <button
                onclick={() => instructeurFollowsDossier(email, dossier.id)}
                class="fr-btn fr-btn--sm fr-icon-star-line fr-btn--icon-left"
                >Suivre ce dossier</button
              >
            {/if}
          {/if}

          <button
            type="button"
            class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-mail-line"
            title={unread ? "Marquer le dossier comme lu" : "Marquer le dossier comme non lu"}
            onclick={() => onSetRead(unread)}
          >
            {unread ? "Marquer le dossier comme lu" : "Marquer le dossier comme non lu"}
          </button>

          <DossierActionsMenu
            dossierId={dossier.id}
            dossierName={dossier.name}
            extraItems={[
              { label: "Ajouter une pièce jointe", onClick: openPieceJointeModal },
              {
                label: "Voir le dossier en lecture seule",
                onClick: () => (lectureSeuleModalOpen = true),
              },
            ]}
          />
        </div>
      </div>
    </div>
  </div>
</header>

{#if followersModalOpen}
  <AssignDossierFollowersModal
    dossierId={dossier.id}
    dossierName={dossier.name}
    onClose={() => (followersModalOpen = false)}
  />
{/if}

{#if lectureSeuleModalOpen}
  <ModalLectureSeule onClose={() => (lectureSeuleModalOpen = false)} />
{/if}

<ModalAddPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="enteteDossier"
/>
