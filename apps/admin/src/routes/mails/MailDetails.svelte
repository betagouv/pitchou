<script lang="ts">
  import Modal from "#lib/components/Modal.svelte";
  import type { EmailDetail } from "@pitchou/types/adminEmails.ts";
  import {
    kindLabels,
    statusLabels,
    environmentLabels,
    reasonLabels,
    eventLabels,
    formatDate,
  } from "./labels.ts";
  let {
    detail,
    onClose,
    trigger,
  }: { detail: EmailDetail | null; onClose: () => void; trigger: HTMLElement | null } = $props();
  const row = $derived(detail?.row);
  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    onClose();
  }
  function trapFocus(event: KeyboardEvent & { currentTarget: HTMLDialogElement }) {
    if (event.key !== "Tab") return;
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLElement>("button, a[href], [tabindex]"),
    ].filter(
      (item) =>
        item.tabIndex >= 0 && !item.hasAttribute("disabled") && item.getClientRects().length > 0,
    );
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  function open(dialog: HTMLDialogElement) {
    dialog.showModal();
    return {
      destroy() {
        dialog.close();
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      },
    };
  }
</script>

<dialog
  class="mail-dialog"
  use:open
  onkeydown={trapFocus}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  aria-label="Détails du mail"
>
  <Modal title="Détails du mail" size="large" onClose={close}>
    <div class="mail-detail notification-monitor">
      {#if detail && row}
        <div class="detail-heading">
          <span class="row-eyebrow"
            >{kindLabels[row.kind]} · {environmentLabels[row.environment] ?? row.environment}</span
          >
          <h3>{row.subject ?? "Objet non enregistré"}</h3>
          <p class="history-id">{row.source}:{row.id}</p>
        </div>
        <dl class="mail-metadata">
          {#each [["Dossier", `${row.dossier} · ${row.dossier_name ?? "Dossier sans titre"}`], ["Destinataire", [row.first_names, row.last_name]
                .filter(Boolean)
                .join(" ") || (row.source === "cnpn" ? "CNPN" : "Nom non renseigné")], ["Personne", row.personne ? `#${row.personne}` : "Non enregistrée"], ["Adresses d’envoi", detail.recipients.join(", ") || "Non enregistrées"], ["Copie", detail.cc.join(", ") || "Aucune copie enregistrée"], ["Envoyé par", detail.sentBy ?? "Non enregistré"], ["État", statusLabels[row.status] ?? row.status], ["Création", formatDate(row.created_at)], [row.source === "cnpn" ? "Demande d’envoi" : "Envoi prévu", formatDate(row.due_at)], ["Accepté par l’expéditeur", formatDate(row.sent_at)], ["Première tentative", formatDate(detail.firstAttemptAt)], ["Prochaine reprise", formatDate(row.retry_at)], ["Tentatives", row.attempt_count === null ? "Non enregistrées" : String(row.attempt_count)], ["Identifiant du prestataire", row.provider_message_id ?? "Non enregistré"], ["Erreur", row.last_error ? (reasonLabels[row.last_error] ?? row.last_error) : "Aucune enregistrée"], ["Motif d’annulation", row.cancellation_reason ? (reasonLabels[row.cancellation_reason] ?? row.cancellation_reason) : "Aucun"]] as [label, value]}<div
            >
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>{/each}
          {#if row.source === "cnpn"}
            {#each [["Reçu par le CNPN", row.delivered_at], ["Ouverture détectée", row.opened_at], ["Accusé de lecture envoyé", detail.readReceiptSentAt]] as [label, date]}<div
              >
                <dt>{label}</dt>
                <dd>{formatDate(date)}</dd>
              </div>{/each}
          {/if}
        </dl>
        <div class="detail-actions">
          <a class="fr-btn fr-btn--secondary fr-btn--sm" href={`/dossiers/${row.dossier}`}
            >Ouvrir le dossier</a
          ><a
            class="fr-link fr-link--sm"
            href={`?${new URLSearchParams({ email: `${row.source}:${row.id}` })}`}
            >Lien direct vers ce mail</a
          >
        </div>
        <p class="history-note">
          Accepté signifie pris en charge par l'expéditeur. Les confirmations CNPN concernent le
          destinataire principal. Une ouverture détectée ne prouve pas une lecture complète.
        </p>
        {#if detail.attachments.length}<section class="detail-section">
            <h3>Pièces jointes</h3>
            <ul>
              {#each detail.attachments as attachment}<li>{attachment.name}</li>{/each}
            </ul>
          </section>{/if}
        <section class="detail-section">
          <h3>Historique</h3>
          {#if detail.history.length}<ol class="history-timeline">
              {#each detail.history as event}<li>
                  <div>
                    <strong>{eventLabels[event.event] ?? event.event}</strong><time
                      >{formatDate(event.occurred_at)}</time
                    >
                  </div>
                  {#if row.source === "notification"}<p class="muted">
                      Tentative {event.attempt}
                    </p>{/if}
                  {#each ["reason", "errorCategory", "providerMessageId"] as key}{#if event.details[key]}<p
                        class="provider-id"
                      >
                        {key === "providerMessageId"
                          ? "Identifiant du prestataire"
                          : key === "reason"
                            ? "Motif"
                            : "Erreur"} : {reasonLabels[String(event.details[key])] ??
                          String(event.details[key])}
                      </p>{/if}{/each}
                </li>{/each}
            </ol>{:else}<p class="muted">Aucun événement enregistré.</p>{/if}
          {#if row.source === "cnpn"}<p class="muted">
              Dates enregistrées uniquement. Le nombre de tentatives et les échecs intermédiaires ne
              sont pas conservés pour ces mails.
            </p>{/if}
        </section>
        <section class="detail-section">
          <h3>Contenu enregistré</h3>
          {#if detail.html}<div class="mail-content">{@html detail.html}</div>{:else}<p
              class="muted"
            >
              Le contenu est figé à la première tentative. Aucun contenu enregistré pour ce mail.
            </p>{/if}
        </section>
      {:else}<p role="alert">Ce mail est introuvable ou a été supprimé.</p>{/if}
    </div>
  </Modal>
</dialog>
