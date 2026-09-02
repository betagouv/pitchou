<script lang="ts">
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { RequestError } from "$lib/shared/createCapObjectFromURLs/requestWrappers.ts";
  import { createCnpnEmailDraft, updateCnpnAttachmentList } from "./cnpnEmailDraft.ts";
  import { piecesJointesGroups } from "./piecesJointes.ts";
  import { sendCnpnEmail } from "./sendCnpnEmail.ts";
  import CnpnEmailForm from "./CnpnEmailForm.svelte";
  import CnpnEmailLoadingSkeleton from "./CnpnEmailLoadingSkeleton.svelte";
  import CnpnEmailModalFooter from "./CnpnEmailModalFooter.svelte";
  import CnpnEmailModalHeader from "./CnpnEmailModalHeader.svelte";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type File from "@pitchou/types/database/public/File.ts";
  import { onMount, untrack } from "svelte";
  import { dev } from "$app/environment";
  import { env } from "$env/dynamic/public";
  type Props = {
    dossier: DossierFull;
    email: string;
    followers: string[];
    onClose: () => void;
  };
  let { dossier, email, followers, onClose }: Props = $props();
  let dialogElement: HTMLDialogElement | undefined = $state();
  let loading = $state(true);
  let sending = $state(false);
  let submitted = $state(false);
  let retryAllowed = $state(false);
  let sent = $state(false);
  let errorMessage = $state("");
  let recipient = $state(untrack(() => email));
  let subject = $state("");
  let htmlBody = $state("");
  let ccEmails = $state<string[]>([]);
  let selectedIds: File["id"][] = $state([]);
  let EmailRichTextEditorComponent:
    typeof import("$lib/components/EmailRichTextEditor.svelte").default | undefined = $state();
  const requestId = crypto.randomUUID();
  const isTestEnvironment = dev || env.PUBLIC_PITCHOU_ENV === "staging";
  const groups = $derived(piecesJointesGroups(dossier));
  $effect(() => {
    dialogElement?.showModal();
  });
  onMount(() => {
    ccEmails = [...new Set(followers.map((follower) => follower.toLowerCase()))];
    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    void initializeDraft();
    void loadEditor();
    return () => {
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  });
  async function loadEditor() {
    EmailRichTextEditorComponent = (await import("$lib/components/EmailRichTextEditor.svelte"))
      .default;
  }
  async function initializeDraft() {
    try {
      const draft = await createCnpnEmailDraft(dossier, email);
      subject = draft.subject;
      const defaultAttachments = groups
        .flatMap((group) => group.pieces)
        .filter((piece) => piece.fileId && piece.selectedForCnpnByDefault);
      selectedIds = defaultAttachments.map((piece) => piece.fileId!);
      htmlBody = updateCnpnAttachmentList(
        draft.htmlBody,
        defaultAttachments.map((piece) => piece.description?.name ?? piece.label),
      );
    } catch {
      errorMessage = "Le contenu proposé n'a pas pu être généré à partir du dossier.";
    } finally {
      loading = false;
    }
  }
  function close() {
    if (!sending) dialogElement?.close();
  }

  function selectAttachments(ids: File["id"][]) {
    selectedIds = ids;
    const selected = groups
      .flatMap((group) => group.pieces)
      .filter((piece) => piece.fileId && ids.includes(piece.fileId));
    htmlBody = updateCnpnAttachmentList(
      htmlBody,
      selected.map((piece) => piece.description?.name ?? piece.label),
    );
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    submitted = true;
    retryAllowed = false;
    sending = true;
    errorMessage = "";
    try {
      await sendCnpnEmail(dossier.id, {
        requestId,
        recipient: isTestEnvironment ? recipient : undefined,
        subject,
        htmlBody,
        cc: ccEmails,
        attachmentIds: selectedIds,
      });
      sent = true;
      try {
        await refreshDossierFull(dossier.id);
      } catch {
        // Sending succeeded. A later dossier refresh will load the history entry.
      }
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.status === 502) retryAllowed = true;
        else if (![425, 504].includes(error.status)) submitted = false;
      } else {
        // A lost browser response is safe to retry with the same frozen request ID.
        retryAllowed = true;
      }
      errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Le mail n'a pas pu être envoyé. Réessayez dans quelques instants.";
    } finally {
      sending = false;
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="w-[min(70rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  style="margin: auto;"
  aria-labelledby="cnpn-email-title"
  onclose={onClose}
  oncancel={(event) => {
    if (sending) event.preventDefault();
  }}
  onclick={(event) => {
    if (event.target === dialogElement) close();
  }}
>
  <form
    class="flex max-h-[calc(100vh-2rem)] flex-col bg-[var(--background-default-grey)]"
    onsubmit={submit}
  >
    <CnpnEmailModalHeader dossierName={dossier.name ?? dossier.id} {sending} onClose={close} />

    <div class="min-h-0 flex-1 overflow-y-auto fr-p-3w">
      {#if sent}
        <div class="fr-alert fr-alert--success" role="status">
          <h3 class="fr-alert__title">
            {isTestEnvironment
              ? `Mail envoyé à ${recipient}`
              : "Mail envoyé au secrétariat du CNPN"}
          </h3>
          <p>L'envoi a été ajouté à l'historique du dossier.</p>
        </div>
      {:else if loading}
        <CnpnEmailLoadingSkeleton />
      {:else}
        <CnpnEmailForm
          dossierId={dossier.id}
          {isTestEnvironment}
          {groups}
          {submitted}
          {EmailRichTextEditorComponent}
          {selectedIds}
          bind:subject
          bind:recipient
          bind:ccEmails
          bind:htmlBody
          onSelectedIdsChange={selectAttachments}
        />

        {#if errorMessage}
          <p class="fr-error-text fr-mt-2w" role="alert">{errorMessage}</p>
        {/if}
      {/if}
    </div>

    <CnpnEmailModalFooter
      {sent}
      {loading}
      {sending}
      {submitted}
      {retryAllowed}
      editorReady={Boolean(EmailRichTextEditorComponent)}
      {subject}
      {htmlBody}
      onClose={close}
    />
  </form>
</dialog>
