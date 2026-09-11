<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { differenceInCalendarDays } from "date-fns";
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  import { readOnlyMode } from "../../routes/dossier/[dossierId]/Dossier/readOnly.ts";

  let { dossierId }: { dossierId: DossierId } = $props();
  const readOnly = readOnlyMode();
  const notification = $derived(
    readOnly.current ? undefined : store.notificationByDossier.get(dossierId),
  );
  const latestChange = $derived(
    notification?.changes?.toSorted(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
    )[0],
  );
  const ageInDays = $derived(
    latestChange
      ? Math.max(
          0,
          differenceInCalendarDays(
            new Date(),
            new Date(latestChange.modified_at ?? latestChange.detected_at),
          ),
        )
      : 0,
  );
</script>

{#if notification?.new_arrival}
  <span
    class="notification-badge"
    title={`Arrivé dans Pitchou le ${formatDateAbsolute(new Date(notification.new_arrival.detected_at), "dd/MM/yyyy")}`}
    >Nouveau dossier</span
  >
{/if}
{#if !notification?.new_arrival && notification?.new_follow}
  <span
    class="notification-badge"
    title={`Suivi depuis le ${formatDateAbsolute(new Date(notification.new_follow.detected_at), "dd/MM/yyyy")}`}
    >Nouveau suivi</span
  >
{/if}
{#if !notification?.new_arrival && latestChange}
  <span
    class="notification-badge"
    title={`Modifié le ${formatDateAbsolute(new Date(latestChange.modified_at ?? latestChange.detected_at), "dd/MM/yyyy")}`}
    >{`Modifié ${ageInDays === 0 ? "aujourd'hui" : `il y a ${ageInDays}j`}`}</span
  >
{/if}

<style>
  .notification-badge {
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    background: #ffe7a3;
    color: #5c4813;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.25;
  }
</style>
