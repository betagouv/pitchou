<script lang="ts">
  let { html }: { html: string | null } = $props();
</script>

{#if html}
  <iframe
    class="email-preview"
    title="Contenu enregistré du mail"
    srcdoc={html}
    sandbox="allow-popups allow-popups-to-escape-sandbox"
    referrerpolicy="no-referrer"
  ></iframe>
{:else}
  <div class="empty-preview">
    <span class="fr-icon-mail-line" aria-hidden="true"></span>
    <p>Aucun contenu enregistré.</p>
    <span>Le contenu d'une notification est figé à sa première tentative d'envoi.</span>
  </div>
{/if}

<style>
  .email-preview {
    display: block;
    width: 100%;
    height: min(58dvh, 42rem);
    min-height: 22rem;
    border: 0;
    background: #fff;
    color-scheme: light;
  }
  .empty-preview {
    display: grid;
    gap: 0.5rem;
    justify-items: center;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-mention-grey);
    font-size: 0.8125rem;
  }
  .empty-preview p {
    margin: 0;
    color: var(--text-default-grey);
    font-weight: 600;
  }
  @media (max-width: 575px) {
    .email-preview {
      height: 54dvh;
      min-height: 20rem;
    }
  }
</style>
