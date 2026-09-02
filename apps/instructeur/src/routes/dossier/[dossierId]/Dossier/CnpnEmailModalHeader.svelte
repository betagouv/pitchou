<script lang="ts">
  let {
    dossierName,
    sending,
    onClose,
  }: { dossierName: string | number; sending: boolean; onClose: () => void } = $props();
</script>

<header
  class="flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-p-3w"
>
  <div>
    <h2 id="cnpn-email-title" class="fr-h4 fr-m-0">Envoyer la saisine au CNPN</h2>
    <p class="fr-hint-text fr-mt-1v fr-mb-0">Dossier {dossierName}</p>
  </div>
  <button
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
    title="Fermer"
    disabled={sending}
    onclick={onClose}>Fermer</button
  >
</header>
