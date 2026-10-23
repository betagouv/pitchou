<script lang="ts">
  import type { EmailRow } from "@pitchou/types/adminEmails.ts";
  import {
    kindLabels,
    statusLabels,
    environmentLabels,
    reasonLabels,
    formatDate,
  } from "./labels.ts";
  let {
    rows,
    onOpen,
  }: { rows: EmailRow[]; onOpen: (row: EmailRow, trigger: HTMLElement) => void } = $props();
</script>

<div class="notification-table" role="region" aria-label="Tableau des mails">
  <table>
    <caption class="sr-only">Mails CNPN et notifications</caption>
    <thead
      ><tr
        >{#each ["Dossier / mail", "Destinataire", "Envoi prévu / demande", "État", "Suivi"] as heading}<th
            scope="col">{heading}</th
          >{/each}</tr
      ></thead
    >
    <tbody
      >{#each rows as row (`${row.source}:${row.id}`)}
        <!-- The native details button is the keyboard entry point. Other row space is a click shortcut; links keep their own action. -->
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <tr
          onclick={(event) => {
            if ((event.target as HTMLElement).closest("a,button")) return;
            const trigger = event.currentTarget.querySelector<HTMLButtonElement>("button");
            if (trigger) onOpen(row, trigger);
          }}
        >
          <td data-label="Dossier"
            ><div class="row-eyebrow">{kindLabels[row.kind]} <span>#{row.dossier}</span></div>
            <button
              class="mail-row-title"
              onclick={(event) => onOpen(row, event.currentTarget)}
              aria-label={`Détails du mail ${kindLabels[row.kind]}, ${row.dossier_name ?? row.dossier}`}
            >
              {row.dossier_name ?? "Dossier sans titre"}</button
            >
            {#if row.subject}<span class="row-secondary mail-subject">{row.subject}</span>{/if}
          </td>
          <td data-label="Destinataire"
            ><span class="recipient-name"
              >{[row.first_names, row.last_name].filter(Boolean).join(" ") ||
                (row.source === "cnpn" ? "CNPN" : "Nom non renseigné")}</span
            ><span class="row-secondary">{row.email ?? "Adresse absente"}</span></td
          >
          <td data-label="Envoi prévu / demande"
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
              ><span class="status-dot" aria-hidden="true"></span>{statusLabels[row.status] ??
                row.status}</span
            ><span class="row-secondary"
              >{environmentLabels[row.environment] ?? row.environment}</span
            >
            {#if row.last_error || row.cancellation_reason}<span class="row-diagnostic"
                >{reasonLabels[row.cancellation_reason ?? row.last_error ?? ""] ??
                  row.cancellation_reason ??
                  row.last_error}</span
              >{/if}
          </td>
          <td data-label="Suivi"
            >{#if row.source === "cnpn"}<span class="row-secondary"
                >{row.delivered_at ? "Réception confirmée" : "Réception non confirmée"}</span
              ><span class="row-secondary"
                >{row.opened_at ? "Ouverture détectée" : "Ouverture non détectée"}</span
              >{:else}<span class="attempt-count"
                >{row.attempt_count} tentative{(row.attempt_count ?? 0) > 1 ? "s" : ""}</span
              >{/if}<span class="row-secondary"
              >Voir les détails <span
                class="fr-icon-arrow-right-s-line fr-icon--sm"
                aria-hidden="true"
              ></span></span
            ></td
          >
        </tr>
      {/each}</tbody
    >
  </table>
</div>
