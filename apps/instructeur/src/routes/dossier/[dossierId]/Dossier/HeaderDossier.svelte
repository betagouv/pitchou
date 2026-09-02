<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";

  import { formatLastModified, formatLocalisation } from "$lib/dossier/displayDossier.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import TagEcheance from "$lib/components/TagEcheance.svelte";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import AssignDossierFollowersModal from "$lib/components/DossierFollowerAssignment/AssignDossierFollowersModal.svelte";
  import { readOnlyMode } from "./readOnly.ts";
  import HeaderActions from "./HeaderDossier/HeaderActions.svelte";
  import { followersLabel, titleSizeClass } from "./HeaderDossier/labels.ts";

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
    /** Switches the dossier to read-only mode. */
    onEnterReadOnly: () => void;
  };

  let {
    dossier,
    email,
    currentDossierFollowedByCurrentInstructeur,
    dossierFollowers,
    notification,
    onSetRead,
    onEnterReadOnly,
  }: Props = $props();

  const readOnly = readOnlyMode();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-entete";

  let followersModalOpen = $state(false);

  const unread = $derived(notification?.viewed === false);

  const nouveauteLabel = $derived(formatLastModified(notification?.updated_at));

  const titleClass = $derived(titleSizeClass(dossier.name));

  const followers = $derived(followersLabel(dossierFollowers));

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
    <ActiviteIcon mainActivite={dossier.activite_label} size="size-24 lg:size-28" />

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

        <HeaderActions
          {dossier}
          {email}
          {unread}
          followersLabel={followers}
          followedByCurrentInstructeur={currentDossierFollowedByCurrentInstructeur}
          onOpenFollowers={() => (followersModalOpen = true)}
          onAddPieceJointe={openPieceJointeModal}
          {onSetRead}
          {onEnterReadOnly}
        />
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

{#if !readOnly.current}
  <ModalAddPieceJointe
    id={idModalAddPieceJointe}
    {dossier}
    typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
    source="enteteDossier"
  />
{/if}
