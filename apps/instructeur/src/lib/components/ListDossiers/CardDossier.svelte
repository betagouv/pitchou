<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import {
    formatLastModified,
    formatLocalisation,
    formatPorteurDeProjet,
  } from "$lib/dossier/displayDossier.ts";
  import ActiviteIcon from "$lib/components/ActiviteIcon.svelte";
  import TagEcheance from "$lib/components/TagEcheance.svelte";
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";
  import PhaseProgress from "./PhaseProgress.svelte";
  import { TILE_GRID } from "./rowLayout.ts";

  type Props = {
    dossier: DossierSummary;
    currentInstructeurFollowsDossier: (id: Dossier["id"]) => Promise<void>;
    currentInstructeurLeavesDossier: (id: Dossier["id"]) => Promise<void>;
    notificationViewed: boolean;
    /** When the dossier last changed, to date the « Modifié » badge. */
    notificationUpdatedAt?: Date | string | null;
    dossierFollowedByCurrentInstructeur: boolean;
  };

  let {
    dossier,
    dossierFollowedByCurrentInstructeur,
    currentInstructeurFollowsDossier,
    currentInstructeurLeavesDossier,
    notificationViewed,
    notificationUpdatedAt,
  }: Props = $props();

  const name = $derived(dossier.name || "(nom non renseigné)");

  // Unread tiles stand out: white and bold on the grey page, with a marked
  // border. Read tiles blend into the background.
  const unread = $derived(notificationViewed === false);
  const tileClass = $derived(
    unread
      ? "border-[color:var(--border-plain-grey)] bg-[var(--background-default-grey)]"
      : "border-[color:var(--border-default-grey)] bg-[var(--background-alt-grey)]",
  );
  const porteurDeProjet = $derived(formatPorteurDeProjet(dossier) || "(non renseigné)");
  const localisation = $derived(formatLocalisation(dossier) || "(non renseignée)");
  const importPlatforms: Record<string, string> = {
    gunenv: "GunEnv",
    onagre: "Onagre",
    import_fichier: "un fichier du service",
  };
  const reference = $derived(
    dossier.source === "demarche_numerique"
      ? dossier.demarche_numerique_number
        ? `Dossier n°${dossier.demarche_numerique_number}`
        : `Dossier DN · identifiant Pitchou n°${dossier.id}`
      : dossier.source === "pitchou"
        ? `Dossier Pitchou n°${dossier.id}`
        : importPlatforms[dossier.source]
          ? `Dossier n°${dossier.id} · importé depuis ${importPlatforms[dossier.source]}`
          : `Dossier n°${dossier.id} · source inconnue`,
  );
</script>

<!-- `relative` anchors the overlay that makes the whole tile open the dossier. -->
<div
  class="{TILE_GRID} {tileClass} relative rounded-[0.25rem] border fr-px-2w fr-py-2w"
  data-testid="card-dossier"
>
  <!-- Suivi, activité and nom du projet share a line on narrow screens, and become three
       separate grid columns once the tile is wide enough. -->
  <div class="flex min-w-0 items-center gap-3 lg:contents">
    {#if dossierFollowedByCurrentInstructeur}
      <button
        type="button"
        class="fr-btn fr-icon-star-fill fr-btn--tertiary-no-outline fr-btn--sm relative z-10 lg:self-center"
        onclick={() => currentInstructeurLeavesDossier(dossier.id)}
      >
        Ne plus suivre
      </button>
    {:else}
      <button
        type="button"
        class="fr-btn fr-icon-star-line fr-btn--tertiary-no-outline fr-btn--sm relative z-10 lg:self-center"
        onclick={() => currentInstructeurFollowsDossier(dossier.id)}
      >
        Suivre
      </button>
    {/if}

    <span class="shrink-0 lg:self-center">
      <ActiviteIcon mainActivite={dossier.main_activite} />
    </span>

    <div class="min-w-0">
      <h4 class="fr-mb-0 text-[1rem] leading-[1.4]">
        <!-- The link stretches over the whole tile, so a click anywhere opens the
             dossier while the page keeps a single, properly named link. Controls
             that do something else sit above it. -->
        <a
          href={`/dossier/${dossier.id}`}
          class="fr-link block truncate text-[color:var(--text-title-grey)] after:absolute after:inset-0 after:content-[''] {unread
            ? 'font-bold'
            : 'font-normal'}"
          title={name}
        >
          {name}
        </a>
      </h4>
      <p class="fr-mb-0 fr-text--xs truncate text-[color:var(--text-mention-grey)]">
        {reference}
      </p>
      {#if dossier.enjeu}
        <p
          class="fr-badge fr-badge--sm fr-badge--no-icon fr-mt-1v bg-transparent px-0 text-[color:var(--text-active-blue-france)]"
        >
          Dossier à enjeu
        </p>
      {/if}
    </div>
  </div>

  <div class="min-w-0">
    <p class="fr-mb-0 truncate font-bold" title={porteurDeProjet}>
      <span class="fr-sr-only">Pétitionnaire&nbsp;:</span>
      {porteurDeProjet}
    </p>
    <p class="fr-mb-0 flex min-w-0 items-center gap-1 text-[color:var(--text-mention-grey)]">
      <span class="fr-icon-map-pin-2-line fr-icon--sm flex-none" aria-hidden="true"></span>
      <span class="fr-sr-only">Localisation&nbsp;:</span>
      <span class="truncate" title={localisation}>{localisation}</span>
    </p>
  </div>

  <PhaseProgress phase={dossier.phase} />

  <div class="min-w-0">
    <span class="fr-sr-only">Prochaine action attendue de&nbsp;:</span>
    <p class="fr-mb-0 font-bold leading-tight">
      {dossier.next_action_expected_from || "(non renseignée)"}
    </p>
    {#if dossier.next_action_expected}
      <p class="fr-mb-0 leading-tight">→&nbsp;{dossier.next_action_expected}</p>
    {/if}
  </div>

  <!-- Alerts stack: when the dossier changed, then how its échéance stands. -->
  <div class="flex flex-col items-start gap-1">
    {#if unread}
      <p class="fr-badge fr-badge--sm fr-badge--new">
        {formatLastModified(notificationUpdatedAt)}
      </p>
    {/if}
    <TagEcheance dueDate={dossier.next_due_date} />
  </div>

  <div class="relative z-10 flex flex-none flex-row items-start justify-end">
    <DossierActionsMenu
      dossierId={dossier.id}
      dossierName={dossier.name}
      extraItems={[
        {
          label: unread ? "Marquer le dossier comme lu" : "Marquer le dossier comme non lu",
          onClick: () => void updateNotificationForDossier({ dossier: dossier.id, viewed: unread }),
        },
      ]}
    />
  </div>
</div>
