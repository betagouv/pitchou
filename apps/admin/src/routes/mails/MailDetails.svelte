<script lang="ts">
  import Modal from "#lib/components/Modal.svelte";
  import type { EmailDetail } from "@pitchou/types/adminEmails.ts";
  import MailPreview from "./MailPreview.svelte";
  import MailTimeline from "./MailTimeline.svelte";
  import { kindLabels, emailStatusLabel, environmentLabels } from "./labels.ts";
  import { trapDialogFocus, showMailDialog } from "./MailDetails/dialog.ts";
  import { mailMetadata } from "./MailDetails/metadata.ts";
  import "./MailDetails/styles.css";
  let {
    detail,
    onClose,
    trigger,
  }: { detail: EmailDetail | null; onClose: () => void; trigger: HTMLElement | null } = $props();
  const row = $derived(detail?.row);
  let closing = false;
  let active = $state("history");
  const recordKey = $derived(row ? `${row.source}:${row.id}` : "");
  $effect(() => {
    if (recordKey) {
      active = "history";
      closing = false;
    }
  });
  const tabs = $derived([
    { id: "history", label: `Historique${detail ? ` · ${detail.history.length}` : ""}` },
    { id: "preview", label: "Mail" },
    { id: "information", label: "Informations" },
  ]);
  function close() {
    if (closing) return;
    closing = true;
    onClose();
  }
  function open(dialog: HTMLDialogElement) {
    return showMailDialog(dialog, () => trigger);
  }
  function tabKey(event: KeyboardEvent, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    active = tabs[next].id;
    document.querySelector<HTMLElement>(`#mail-tab-${active}`)?.focus();
  }
</script>

<dialog
  class="mail-dialog"
  use:open
  onkeydown={trapDialogFocus}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  aria-label="Détails du mail"
>
  <Modal title="Détails du mail" size="xlarge" onClose={close} insideNativeDialog>
    {#if detail && row}
      <div class="mail-detail">
        <header class="mail-summary">
          <div class="mail-eyebrow">
            <span>{kindLabels[row.kind]}</span><span
              >{environmentLabels[row.environment] ?? row.environment}</span
            ><span class="mail-state" data-status={row.status}>{emailStatusLabel(row)}</span>
          </div>
          <h3>{row.subject ?? "Objet non enregistré"}</h3>
          <div class="mail-envelope">
            <a class="mail-dossier" href={`/dossiers/${row.dossier}`}>
              <span class="fr-icon-folder-2-line fr-icon--sm" aria-hidden="true"></span>
              Dossier #{row.dossier}
              <span class="fr-icon-arrow-right-s-line fr-icon--sm" aria-hidden="true"></span>
            </a><span>À {detail.recipients.join(", ") || "Destinataire non enregistré"}</span>
          </div>
        </header>
        <div class="mail-tabs" role="tablist" aria-label="Détails du mail">
          {#each tabs as tab, index}<button
              type="button"
              role="tab"
              id={`mail-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`mail-pane-${tab.id}`}
              tabindex={active === tab.id ? 0 : -1}
              onclick={() => (active = tab.id)}
              onkeydown={(event) => tabKey(event, index)}>{tab.label}</button
            >{/each}
        </div>
        <div
          class="mail-pane"
          role="tabpanel"
          id={`mail-pane-${active}`}
          aria-labelledby={`mail-tab-${active}`}
          tabindex="0"
        >
          {#if active === "preview"}<MailPreview html={detail.html} />
          {:else if active === "history"}<div class="mail-pane-content">
              <MailTimeline
                history={detail.history}
                attempts={row.source === "notification"}
              />{#if row.source === "cnpn"}<p class="mail-note">
                  Dates enregistrées uniquement. Les tentatives intermédiaires ne sont pas
                  conservées pour les mails CNPN.
                </p>{/if}
            </div>
          {:else}<div class="mail-pane-content">
              <dl class="mail-metadata">
                {#each mailMetadata(detail) as [label, value]}<div>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>{/each}
              </dl>
              {#if detail.attachments.length}<h4>Pièces jointes</h4>
                <ul class="mail-attachments">
                  {#each detail.attachments as attachment}<li>{attachment.name}</li>{/each}
                </ul>{/if}
              <p class="mail-note">
                Les confirmations CNPN concernent le destinataire principal. Une ouverture détectée
                ne prouve pas une lecture complète. Sans signal d'ouverture, la lecture reste
                inconnue, car les images ou le suivi peuvent être bloqués.
              </p>
              <a
                class="mail-permalink"
                href={`?${new URLSearchParams({ email: `${row.source}:${row.id}` })}`}
                >Lien direct vers ce mail<span class="fr-icon-link fr-icon--sm" aria-hidden="true"
                ></span></a
              >
            </div>
          {/if}
        </div>
      </div>
    {:else}<p class="mail-pane-content" role="alert">
        Ce mail est introuvable ou a été supprimé.
      </p>{/if}
    {#snippet footer()}<span class="mail-footer-note"
        >{active === "preview" && detail?.html
          ? "Contenu enregistré · Images externes bloquées"
          : "Dates à l'heure de Paris"}</span
      ><button
        type="button"
        class="mail-close"
        aria-label="Fermer les détails du mail"
        onclick={close}>Fermer</button
      >{/snippet}
  </Modal>
</dialog>
