<script lang="ts">
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import Pictogramme from "$lib/components/DSFR/Pictogramme.svelte";
  import { piecesJointesGroups } from "../piecesJointes.ts";
  import {
    DEFAULT_MAIL_RECIPIENT,
    buildMailtoUrl,
    measureMailtoUrl,
    defaultMailSubject,
    openMailClient,
    splitSubjectAndBody,
  } from "./mail.ts";
  import MailAttachmentPicker from "./MailAttachmentPicker.svelte";
  import { downloadUrls } from "./download.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    open: boolean;
    dossier: DossierFull;
    documentName: string;
    documentUrl: string;
    documentText: string;
    onClose: () => void;
  };

  let { open, dossier, documentName, documentUrl, documentText, onClose }: Props = $props();

  let recipient = $state(DEFAULT_MAIL_RECIPIENT);
  let subject = $state("");
  let body = $state("");
  let selectedUrls: string[] = $state([]);
  let attachGeneratedDocument = $state(true);
  let bodyWasCopied = $state(false);

  const groups = $derived(piecesJointesGroups(dossier));
  const draft = $derived({ recipient, subject, body });
  const measure = $derived(measureMailtoUrl(draft));
  const bodyFits = $derived(measure.fits);
  const countFormat = new Intl.NumberFormat("fr-FR");
  const attachmentCount = $derived(selectedUrls.length + (attachGeneratedDocument ? 1 : 0));

  let dialogElement: HTMLDialogElement | undefined = $state();

  // Sync the native <dialog> with the controlled `open` prop.
  $effect(() => {
    if (!dialogElement) return;
    if (open && !dialogElement.open) dialogElement.showModal();
    if (!open && dialogElement.open) dialogElement.close();
  });

  // Reopening the modal starts from a clean draft rather than the previous edits.
  $effect(() => {
    if (!open) return;
    // The template writes its own subject on the first line; keep it out of the body.
    const split = splitSubjectAndBody(documentText);
    recipient = DEFAULT_MAIL_RECIPIENT;
    subject = split.subject || defaultMailSubject(dossier, documentName);
    body = split.body;
    selectedUrls = [];
    attachGeneratedDocument = true;
    bodyWasCopied = false;
  });

  async function openMail() {
    // Copy first: the clipboard needs the click gesture, which the downloads below would spend.
    if (!bodyFits) {
      try {
        await navigator.clipboard.writeText(body);
        bodyWasCopied = true;
      } catch {
        bodyWasCopied = false;
      }
    }

    const attachments = [
      ...(attachGeneratedDocument ? [{ url: documentUrl, name: documentName }] : []),
      ...groups
        .flatMap((group) => group.pieces)
        .filter((piece) => selectedUrls.includes(piece.url))
        .map((piece) => ({ url: piece.url, name: piece.description?.name || piece.label })),
    ];

    await downloadUrls(attachments);

    sendEvenement({ type: "envoyerUnDocumentParMail", details: { dossierId: dossier.id } });
    openMailClient(buildMailtoUrl(bodyFits ? draft : { ...draft, body: "" }));
  }
</script>

<!-- Clicking the backdrop (the dialog element itself, outside its content) closes the modal. -->
<!-- `m-auto` centers the modal: Tailwind's Preflight resets the browser's own
     `dialog:modal { margin: auto }`, which would otherwise pin it to the top left. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="m-auto w-[clamp(20rem,52rem,100vw)] max-w-[100vw] max-h-[90vh] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  aria-labelledby="envoyer-par-mail-titre"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) onClose();
  }}
>
  <div class="flex flex-col max-h-[90vh] bg-[var(--background-default-grey)]">
    <header
      class="flex items-center justify-between gap-4 fr-py-2w fr-px-3w border-b border-[color:var(--border-default-grey)]"
    >
      <div class="flex items-center gap-3">
        <Pictogramme name="mail-send" size={48} />
        <h2 id="envoyer-par-mail-titre" class="fr-m-0 fr-h4">Envoyer par mail</h2>
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer"
        onclick={onClose}>Fermer</button
      >
    </header>

    <div class="flex-[1_1_auto] overflow-y-auto fr-py-2w fr-px-3w">
      <div class="fr-input-group">
        <label class="fr-label" for="mail-destinataire">Destinataire</label>
        <input class="fr-input" id="mail-destinataire" type="email" bind:value={recipient} />
      </div>

      <div class="fr-input-group">
        <label class="fr-label" for="mail-objet">Objet</label>
        <input class="fr-input" id="mail-objet" type="text" bind:value={subject} />
      </div>

      <div class="fr-input-group">
        <label class="fr-label" for="mail-corps">
          Corps du message
          <span class="fr-hint-text">Repris du document généré. Vous pouvez le modifier ici.</span>
        </label>
        <textarea class="fr-input" id="mail-corps" rows="12" bind:value={body}></textarea>
      </div>

      {#if !bodyFits}
        <div class="fr-alert fr-alert--info fr-alert--sm fr-mb-3w">
          <p>
            Ce message est trop long pour être transmis à votre logiciel de messagerie. Il sera
            <strong>copié dans votre presse-papier</strong> : il vous restera à le coller dans le mail
            (Ctrl+V).
          </p>
          <p class="fr-text--xs fr-mb-0">
            {countFormat.format(measure.typed)} caractères saisis, soit
            {countFormat.format(measure.encoded)} une fois codés dans l'adresse mailto, au-delà des
            {countFormat.format(measure.limit)} que les logiciels de messagerie acceptent. Un espace y
            compte pour 3 caractères, une lettre accentuée pour 6.
          </p>
        </div>
      {/if}

      <MailAttachmentPicker
        {groups}
        {documentName}
        bind:selectedUrls
        bind:attachGeneratedDocument
      />
    </div>

    <footer
      class="flex items-center justify-between gap-4 fr-py-2w fr-px-3w border-t border-[color:var(--border-default-grey)]"
    >
      <p class="fr-m-0 fr-text--sm">
        {#if bodyWasCopied}
          Message copié dans le presse-papier : collez-le dans le mail (Ctrl+V).
        {:else if attachmentCount > 0}
          {attachmentCount} fichier{attachmentCount > 1 ? "s" : ""} à télécharger puis à glisser dans
          le mail.
        {/if}
      </p>
      <button
        type="button"
        class="fr-btn fr-btn--icon-left fr-icon-mail-send-line"
        onclick={openMail}
        disabled={!recipient}
      >
        Ouvrir dans mon logiciel de messagerie
      </button>
    </footer>
  </div>
</dialog>
