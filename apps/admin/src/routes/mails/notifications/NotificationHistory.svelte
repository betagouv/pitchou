<script lang="ts">
  import type { NotificationHistoryRow } from "@pitchou/types/emailNotifications.ts";
  import { eventLabels, environmentLabels, reasonLabels, formatDate } from "./labels.ts";
  let { id, history }: { id: string; history: NotificationHistoryRow[] } = $props();
</script>

<section
  class="border border-[var(--border-default-grey)] p-4"
  aria-labelledby="notification-history-title"
>
  <h2 id="notification-history-title" class="fr-h5">Historique de la notification</h2>
  <p class="break-all font-mono">{id}</p>
  {#if history.length === 0}<p>
      Aucun événement enregistré. Les événements antérieurs à l'activation du suivi ne sont pas
      reconstitués.
    </p>
  {:else}
    <ol class="flex flex-col gap-4">
      {#each history as event}
        <li>
          <strong>{eventLabels[event.event] ?? event.event}</strong>, {formatDate(
            event.occurred_at,
          )}<br />
          Tentative {event.attempt} · {environmentLabels[event.environment] ?? event.environment}
          {#if event.details.reason}<p class="fr-mb-0">
              Motif : {reasonLabels[String(event.details.reason)] ?? event.details.reason}
            </p>{/if}
          {#if event.details.errorCategory}<p class="fr-mb-0">
              Erreur : {reasonLabels[String(event.details.errorCategory)] ??
                event.details.errorCategory}
            </p>{/if}
          {#if event.details.providerMessageId}<p class="fr-mb-0 break-all">
              Identifiant du prestataire : {String(event.details.providerMessageId)}
            </p>{/if}
        </li>
      {/each}
    </ol>
  {/if}
</section>
