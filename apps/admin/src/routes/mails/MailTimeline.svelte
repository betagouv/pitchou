<script lang="ts">
  import type { NotificationHistoryRow } from "@pitchou/types/emailNotifications.ts";
  import { eventLabels, reasonLabels, formatDate } from "./labels.ts";
  let { history, attempts }: { history: NotificationHistoryRow[]; attempts: boolean } = $props();
</script>

{#if history.length}
  <ol class="mail-timeline" role="list" aria-label="Historique du mail">
    {#each history as event}
      <li>
        <div class="event-rail" aria-hidden="true"><span></span></div>
        <div class="event-content">
          <div class="event-heading">
            <strong>{eventLabels[event.event] ?? event.event}</strong
            >{#if attempts && event.attempt > 0}<span class="event-attempt"
                >Tentative {event.attempt}</span
              >{/if}
          </div>
          <time datetime={new Date(event.occurred_at).toISOString()}
            >{formatDate(event.occurred_at)}</time
          >
          {#each ["reason", "errorCategory", "providerMessageId"] as key}{#if event.details[key]}<p
                class="event-diagnostic"
              >
                {key === "providerMessageId"
                  ? "Identifiant du prestataire"
                  : key === "reason"
                    ? "Motif"
                    : "Erreur"} :
                <span>{reasonLabels[String(event.details[key])] ?? String(event.details[key])}</span
                >
              </p>{/if}{/each}
        </div>
      </li>
    {/each}
  </ol>
{:else}<p class="timeline-empty">Aucun événement enregistré.</p>{/if}

<style>
  ol.mail-timeline {
    list-style: none !important;
    margin: 0 !important;
    padding: 0 !important;
    counter-reset: none;
  }
  ol.mail-timeline > li {
    list-style: none !important;
    display: grid;
    grid-template-columns: 0.75rem minmax(0, 1fr);
    gap: 0.875rem;
    margin: 0 !important;
    padding: 0 0 1.25rem !important;
    counter-increment: none;
  }
  ol.mail-timeline > li::before,
  ol.mail-timeline > li::after {
    content: none !important;
    display: none !important;
  }
  ol.mail-timeline > li::marker {
    content: "";
    font-size: 0;
  }
  .event-rail {
    position: relative;
  }
  .event-rail span {
    position: absolute;
    top: 0.375rem;
    left: 0.125rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--text-action-high-blue-france);
  }
  .event-rail::after {
    content: "";
    position: absolute;
    top: 1rem;
    bottom: -0.125rem;
    left: 0.3125rem;
    width: 1px;
    background: var(--border-default-grey);
  }
  li:last-child .event-rail::after {
    display: none;
  }
  .event-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .event-heading {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .event-heading strong {
    font-size: 0.875rem;
    line-height: 1.5;
    font-weight: 600;
  }
  .event-attempt {
    color: var(--text-mention-grey);
    font-size: 0.6875rem;
    white-space: nowrap;
  }
  time {
    font-size: 0.75rem;
    line-height: 1.5;
    color: var(--text-mention-grey);
    font-variant-numeric: tabular-nums;
  }
  .event-diagnostic {
    margin: 0 !important;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--text-mention-grey);
    overflow-wrap: anywhere;
  }
  .event-diagnostic span {
    color: var(--text-default-grey);
  }
  .timeline-empty {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-mention-grey);
  }
</style>
