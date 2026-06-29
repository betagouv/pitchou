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
      <div class="fr-notice__body bandeau-staging__body">
        <p>
          <span class="fr-notice__title">Environnement de test (staging)</span>
          <span class="fr-notice__desc">
            Les données saisies ici ne sont pas envoyées en production et peuvent être effacées à
            tout moment.
          </span>
        </p>
        <a class="fr-btn fr-btn--sm bandeau-staging__btn" href="/dev-login">
          Se connecter en tant que dev
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  /* DSFR has no fr-notice--warning modifier; repaint from the warning tokens */
  .bandeau-staging {
    background-color: var(--background-contrast-warning);
    color: var(--text-default-warning);
  }
  .bandeau-staging :global(.fr-notice__title),
  .bandeau-staging :global(.fr-notice__desc),
  .bandeau-staging :global(.fr-notice__body::before) {
    color: var(--text-default-warning);
  }
  /* Lay text and button on one row, button pushed to the right */
  .bandeau-staging__body {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }
  .bandeau-staging__body > p {
    margin: 0;
    flex: 1;
  }
  /* Repaint the button on the warning tokens to match the banner */
  .bandeau-staging__btn {
    flex: none;
    color: var(--text-default-warning);
    box-shadow: inset 0 0 0 1px var(--text-default-warning);
    background-color: transparent;
  }
  .bandeau-staging__btn:hover {
    background-color: var(--background-contrast-warning-hover, rgba(0, 0, 0, 0.05));
  }
  .bandeau-staging__btn:active {
    background-color: var(--background-contrast-warning-active, rgba(0, 0, 0, 0.1));
  }
</style>
