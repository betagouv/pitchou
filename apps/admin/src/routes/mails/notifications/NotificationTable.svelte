<script lang="ts">
  import type { NotificationRow } from "@pitchou/types/emailNotifications.ts";
  import {
    kindLabels,
    statusLabels,
    environmentLabels,
    reasonLabels,
    formatDate,
  } from "./labels.ts";
  let {
    rows,
    link,
    selected,
  }: {
    rows: NotificationRow[];
    link: (updates: Record<string, string>) => string;
    selected: string;
  } = $props();
</script>

<div class="notification-table" role="region" aria-label="Tableau des envois">
  <table>
    <caption class="sr-only">Historique des envois de notifications</caption>
    <thead
      ><tr
        >{#each ["Dossier / notification", "Destinataire", "Envoi prévu", "État", "Suivi"] as heading}<th
            scope="col">{heading}</th
          >{/each}</tr
      ></thead
    >
    <tbody
      >{#each rows as row (row.id)}
        <tr class:selected={selected === row.id}>
          <td data-label="Dossier"
            ><div class="row-eyebrow">{kindLabels[row.kind]} <span>#{row.dossier}</span></div>
            <a class="dossier-link" href={`/dossiers/${row.dossier}`}
              >{row.dossier_name ?? "Dossier sans titre"}</a
            ></td
          >
          <td data-label="Destinataire"
            ><span class="recipient-name"
              >{[row.first_names, row.last_name].filter(Boolean).join(" ") ||
                "Nom non renseigné"}</span
            ><span class="row-secondary">{row.email ?? "Adresse absente"}</span><span
              class="row-secondary">Personne #{row.personne}</span
            ></td
          >
          <td data-label="Envoi prévu"
            ><span class="row-date">{formatDate(row.due_at)}</span><span class="row-secondary"
              >{row.sent_at
                ? `Accepté le ${formatDate(row.sent_at)}`
                : row.retry_at && row.status === "pending"
                  ? `Reprise le ${formatDate(row.retry_at)}`
                  : ""}</span
            ></td
          >
          <td data-label="État" data-status={row.status}
            ><span class="status-badge"
              ><span class="status-dot" aria-hidden="true"></span>{statusLabels[row.status]}</span
            ><span class="row-secondary">{environmentLabels[row.environment]}</span
            >{#if row.last_error || row.cancellation_reason}<span class="row-diagnostic"
                >{reasonLabels[row.cancellation_reason ?? row.last_error ?? ""] ??
                  row.cancellation_reason ??
                  row.last_error}</span
              >{/if}</td
          >
          <td data-label="Suivi"
            ><span class="attempt-count"
              >{row.attempt_count} tentative{row.attempt_count > 1 ? "s" : ""}</span
            ><a
              class="history-link"
              href={`${link({ notification: row.id })}#notification-history-title`}
              aria-label={`Historique de la notification ${row.id}`}
              >Historique<span class="fr-icon-arrow-right-s-line fr-icon--sm" aria-hidden="true"
              ></span></a
            ></td
          >
        </tr>
      {/each}</tbody
    >
  </table>
</div>
