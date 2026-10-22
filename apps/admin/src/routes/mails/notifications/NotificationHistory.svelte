<script lang="ts">
  import type { NotificationHistoryRow } from "@pitchou/types/emailNotifications.ts";
  import { eventLabels, environmentLabels, reasonLabels, formatDate } from "./labels.ts";
  let {
    id,
    history,
    closeHref,
  }: { id: string; history: NotificationHistoryRow[]; closeHref: string } = $props();
</script>

<section class="notification-history" aria-labelledby="notification-history-title">
  <header class="list-heading">
    <h2 id="notification-history-title" tabindex="-1">Historique de la notification</h2>
    <a class="notification-button" href={closeHref} aria-label="Fermer l'historique"
      ><span class="fr-icon-close-line fr-icon--sm" aria-hidden="true"></span></a
    >
  </header>
  <p class="history-id">{id}</p>
  {#if history.length === 0}<p class="history-note">
      Aucun événement enregistré. Les événements antérieurs à l'activation du suivi ne sont pas
      reconstitués.
    </p>
  {:else}<ol class="history-timeline">
      {#each history as event}
        <li>
          <div>
            <strong>{eventLabels[event.event] ?? event.event}</strong><time
              >{formatDate(event.occurred_at)}</time
            >
          </div>
          <p class="muted">
            Tentative {event.attempt} · {environmentLabels[event.environment] ?? event.environment}
          </p>
          {#if event.details.reason}<p>
              Motif : {reasonLabels[String(event.details.reason)] ?? event.details.reason}
            </p>{/if}
          {#if event.details.errorCategory}<p>
              Erreur : {reasonLabels[String(event.details.errorCategory)] ??
                event.details.errorCategory}
            </p>{/if}
          {#if event.details.providerMessageId}<p class="provider-id">
              Identifiant du prestataire : {String(event.details.providerMessageId)}
            </p>{/if}
        </li>
      {/each}
    </ol>{/if}
  <p class="history-note">
    Un échec peut être repris. Un état incertain nécessite une vérification auprès du prestataire.
  </p>
</section>
