<script lang="ts">
  let {
    sent,
    loading,
    sending,
    countdown,
    onCancelCountdown,
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
    countdown: number;
    onCancelCountdown: () => void;
    submitted: boolean;
    retryAllowed: boolean;
    editorReady: boolean;
    subject: string;
    htmlBody: string;
    onClose: () => void;
  } = $props();
</script>

<footer
  class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[color:var(--border-default-grey)] fr-p-3w"
>
  <button type="button" class="fr-btn fr-btn--secondary" disabled={sending} onclick={onClose}>
    {sent ? "Fermer" : "Annuler"}
  </button>
  {#if !sent && !loading}
    <button
      type={countdown ? "button" : "submit"}
      class="fr-btn"
      onclick={(event) => {
        if (countdown) {
          event.preventDefault();
          onCancelCountdown();
        }
      }}
      aria-live="polite"
      disabled={sending ||
        !editorReady ||
        (submitted && !retryAllowed) ||
        !subject.trim() ||
        !htmlBody.trim()}
    >
      {countdown
        ? `Envoi dans ${countdown} s · Annuler l'envoi`
        : sending
          ? "Envoi en cours..."
          : submitted && retryAllowed
            ? "Réessayer"
            : submitted
              ? "Envoi à vérifier"
              : "Envoyer"}
    </button>
  {/if}
</footer>
