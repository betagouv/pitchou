<script lang="ts">
  let {
    sent,
    loading,
    sending,
    submitted,
    retryAllowed,
    editorReady,
    subject,
    htmlBody,
    onClose,
  }: {
    sent: boolean;
    loading: boolean;
    sending: boolean;
    submitted: boolean;
    retryAllowed: boolean;
    editorReady: boolean;
    subject: string;
    htmlBody: string;
    onClose: () => void;
  } = $props();
</script>

<footer
  class="flex shrink-0 justify-end gap-3 border-t border-[color:var(--border-default-grey)] fr-p-3w"
>
  <button type="button" class="fr-btn fr-btn--secondary" disabled={sending} onclick={onClose}>
    {sent ? "Fermer" : "Annuler"}
  </button>
  {#if !sent && !loading}
    <button
      type="submit"
      class="fr-btn"
      disabled={sending ||
        !editorReady ||
        (submitted && !retryAllowed) ||
        !subject.trim() ||
        !htmlBody.trim()}
    >
      {sending
        ? "Envoi en cours..."
        : submitted && retryAllowed
          ? "Réessayer"
          : submitted
            ? "Envoi à vérifier"
            : "Envoyer"}
    </button>
  {/if}
</footer>
