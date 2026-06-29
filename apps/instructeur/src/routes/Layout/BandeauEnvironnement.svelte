<script lang="ts">
  import { env } from "$env/dynamic/public";

  const environnement = env.PUBLIC_PITCHOU_ENV;
  const estStaging = environnement === "staging";
</script>

{#if estStaging}
  <div
    class="fr-notice fr-notice--info bandeau-staging"
    role="region"
    aria-label="Environnement de test"
  >
    <div class="fr-container">
      <div class="fr-notice__body">
        <p>
          <span class="fr-notice__title">Environnement de test (staging)</span>
          <span class="fr-notice__desc">
            Les données saisies ici ne sont pas envoyées en production et peuvent être effacées à
            tout moment.
          </span>
          <a class="fr-btn fr-btn--secondary fr-btn--sm bandeau-staging__btn" href="/dev-login">
            Se connecter en tant que dev
          </a>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  /* DSFR ne fournit pas de modificateur fr-notice--warning ; on repeint à partir des tokens warning */
  .bandeau-staging {
    background-color: var(--background-contrast-warning);
    color: var(--text-default-warning);
  }
  .bandeau-staging :global(.fr-notice__title),
  .bandeau-staging :global(.fr-notice__desc),
  .bandeau-staging :global(.fr-notice__body::before) {
    color: var(--text-default-warning);
  }
  .bandeau-staging__btn {
    margin-left: 1rem;
  }
</style>
