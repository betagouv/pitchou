<script lang="ts">
  import { env } from "$env/dynamic/public";

  const environnement = env.PUBLIC_PITCHOU_ENV;
  const estStaging = environnement === "staging";
</script>

{#if estStaging}
  <!-- DSFR has no fr-notice--warning modifier; repaint from the warning tokens -->
  <div
    class="fr-notice fr-notice--info bg-[var(--background-contrast-warning)] text-[color:var(--text-default-warning)] [&_.fr-notice\_\_title]:text-[color:var(--text-default-warning)] [&_.fr-notice\_\_desc]:text-[color:var(--text-default-warning)] [&_.fr-notice\_\_body::before]:text-[color:var(--text-default-warning)]"
    role="region"
    aria-label="Environnement de test"
  >
    <div class="fr-container">
      <!-- Lay text and button on one row, button pushed to the right -->
      <div class="fr-notice__body flex items-center flex-wrap gap-x-4 gap-y-2">
        <p class="fr-m-0 flex-1">
          <span class="fr-notice__title">Environnement de test (staging)</span>
          <span class="fr-notice__desc">
            Les données saisies ici ne sont pas envoyées en production et peuvent être effacées à
            tout moment.
          </span>
        </p>
        <!-- Repaint the button on the warning tokens to match the banner -->
        <a
          class="fr-btn fr-btn--sm flex-none text-[color:var(--text-default-warning)] shadow-[inset_0_0_0_1px_var(--text-default-warning)] bg-transparent hover:bg-[var(--background-contrast-warning-hover,rgba(0,0,0,0.05))] active:bg-[var(--background-contrast-warning-active,rgba(0,0,0,0.1))]"
          href="/dev-login"
        >
          Se connecter en tant que dev
        </a>
      </div>
    </div>
  </div>
{/if}
