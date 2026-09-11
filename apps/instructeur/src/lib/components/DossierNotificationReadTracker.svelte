<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  import type { NotificationUpdate } from "@pitchou/types/notification.ts";

  let { dossierId, readOnly }: { dossierId: DossierId; readOnly: boolean } = $props();
  const arrival = $derived(!readOnly && !!store.notificationByDossier.get(dossierId)?.new_arrival);
  const followRevision = $derived(
    !readOnly ? store.notificationByDossier.get(dossierId)?.new_follow?.revision : undefined,
  );

  function startTimer(update: NotificationUpdate) {
    let timer: ReturnType<typeof setTimeout>;
    function restart() {
      clearTimeout(timer);
      if (!document.hidden)
        timer = setTimeout(() => {
          void updateNotificationForDossier(update).catch(() => {
            store.errors.add({
              message:
                "La notification n'a pas pu être validée. Réouvrez le dossier pour réessayer.",
            });
          });
        }, 5000);
    }
    restart();
    document.addEventListener("visibilitychange", restart);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", restart);
    };
  }

  $effect(() => {
    if (!readOnly && arrival) return startTimer({ dossier: dossierId, arrival: true });
  });
  $effect(() => {
    if (!readOnly && followRevision) return startTimer({ dossier: dossierId, followRevision });
  });
</script>
