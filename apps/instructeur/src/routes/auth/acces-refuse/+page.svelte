<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Accès aux dossiers — Pitchou</title>
</svelte:head>

<section class="access-card" aria-labelledby="access-title">
  <span class="access-icon fr-icon-lock-line" aria-hidden="true"></span>
  <h1 id="access-title">Votre accès aux dossiers</h1>
  <p class="access-intro">
    {#if data.disabled}
      Votre compte Pitchou est désactivé. Vous ne pouvez pas accéder aux dossiers.
    {:else if data.signedIn}
      Votre compte est enregistré, mais vous ne pouvez pas encore consulter les dossiers.
    {:else}
      Vous n'êtes pas autorisé à consulter les dossiers.
    {/if}
  </p>
  <div class="access-guidance">
    <h2>Comment obtenir l'accès ?</h2>
    <p>
      Demandez à un administrateur Pitchou de vérifier l'état de votre compte, vos droits et votre
      rattachement à un groupe actif. Le support peut vous orienter si vous ne savez pas qui
      contacter.
    </p>
  </div>
  <div class="access-actions">
    <a class="fr-btn fr-icon-mail-line fr-btn--icon-left" href="mailto:support@pitchou.beta.gouv.fr"
      >Contacter le support</a
    >
    {#if data.signedIn}<a
        class="fr-btn fr-btn--secondary fr-icon-logout-box-r-line fr-btn--icon-left"
        href="/auth/logout">Se déconnecter</a
      >{:else}<a class="fr-btn fr-btn--secondary" href="/auth/login">Retour à la connexion</a>{/if}
  </div>
</section>

<style>
  .access-card {
    width: 100%;
    max-width: 40rem;
    margin: 3rem auto;
    padding: 2rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 1rem;
    background: var(--background-lifted-grey);
  }
  .access-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.25rem;
    border-radius: 0.75rem;
    color: var(--text-action-high-blue-france);
    background: var(--background-action-low-blue-france);
  }
  h1 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    line-height: 1.35;
  }
  p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  .access-intro {
    color: var(--text-mention-grey);
  }
  .access-guidance {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--background-alt-grey);
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  .access-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .access-actions .fr-btn {
    min-height: 2.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }
  .access-actions .fr-btn--secondary {
    border: 1px solid var(--border-default-grey);
    box-shadow: none;
  }
  @media (max-width: 575px) {
    .access-card {
      margin: 1.5rem auto;
      padding: 1.25rem;
    }
    .access-actions {
      flex-direction: column;
    }
    .access-actions .fr-btn {
      justify-content: center;
      width: 100%;
    }
  }
</style>
