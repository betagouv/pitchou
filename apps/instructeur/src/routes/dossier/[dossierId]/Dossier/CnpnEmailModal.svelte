<script lang="ts">
  import { createSubmission } from "./CnpnEmailModal/submission.svelte.ts";
  import CnpnEmailSuccess from "./CnpnEmailModal/CnpnEmailSuccess.svelte";
  import { createCnpnEmailDraft, updateCnpnAttachmentList } from "./cnpnEmailDraft.ts";
  import { piecesJointesGroups } from "./piecesJointes.ts";
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
  const { state: submission, send } = createSubmission(() => dossier.id);
  let countdown = $state(0);
  let countdownTimer: ReturnType<typeof setInterval> | undefined;
  let recipient = $state(untrack(() => email));
  let subject = $state("");
  let htmlBody = $state("");
  let ccEmails = $state<string[]>([]);
  let selectedIds: File["id"][] = $state([]);
  let EmailRichTextEditorComponent:
    typeof import("$lib/components/EmailRichTextEditor.svelte").default | undefined = $state();
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
      cancelCountdown();
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
      submission.errorMessage = "Le contenu proposé n'a pas pu être généré à partir du dossier.";
    } finally {
      loading = false;
    }
  }
  function close() {
    if (!submission.sending) {
      cancelCountdown();
      dialogElement?.close();
    }
  }

  function cancelCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = undefined;
    countdown = 0;
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

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (
      countdown ||
      submission.sending ||
      submission.sent ||
      loading ||
      !EmailRichTextEditorComponent ||
      (submission.submitted && !submission.retryAllowed) ||
      !subject.trim() ||
      !htmlBody.trim()
    )
      return;
    countdown = 3;
    countdownTimer = setInterval(() => {
      countdown -= 1;
      if (countdown === 0) {
        cancelCountdown();
        void send({
          recipient: isTestEnvironment ? recipient : undefined,
          subject,
          htmlBody,
          cc: ccEmails,
          attachmentIds: selectedIds,
        });
      }
    }, 1000);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="w-[min(70rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  style="margin: auto;"
  aria-labelledby="cnpn-email-title"
  onclose={() => {
    cancelCountdown();
    onClose();
  }}
  oncancel={(event) => {
    if (submission.sending) event.preventDefault();
    if (countdown) {
      event.preventDefault();
      cancelCountdown();
    }
  }}
  onclick={(event) => {
    if (event.target === dialogElement) close();
  }}
>
  <form
    class="flex max-h-[calc(100vh-2rem)] flex-col bg-[var(--background-default-grey)]"
    onsubmit={submit}
  >
    <CnpnEmailModalHeader
      dossierName={dossier.name ?? dossier.id}
      sending={submission.sending}
      onClose={close}
    />

    <div class="min-h-0 flex-1 overflow-y-auto fr-p-3w">
      {#if submission.sent}
        <CnpnEmailSuccess {isTestEnvironment} {recipient} />
      {:else if loading}
        <CnpnEmailLoadingSkeleton />
      {:else}
        <CnpnEmailForm
          dossierId={dossier.id}
          {isTestEnvironment}
          {groups}
          submitted={submission.submitted || countdown > 0}
          {EmailRichTextEditorComponent}
          {selectedIds}
          bind:subject
          bind:recipient
          bind:ccEmails
          bind:htmlBody
          onSelectedIdsChange={selectAttachments}
        />
      {/if}
    </div>

    <CnpnEmailModalFooter
      sent={submission.sent}
      {loading}
      sending={submission.sending}
      {countdown}
      errorMessage={submission.errorMessage}
      onCancelCountdown={cancelCountdown}
      submitted={submission.submitted}
      retryAllowed={submission.retryAllowed}
      editorReady={Boolean(EmailRichTextEditorComponent)}
      {subject}
      {htmlBody}
      onClose={close}
    />
  </form>
</dialog>
