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
      <div class="fr-notice__body">
        <p class="fr-m-0">
          <span class="fr-notice__title">Environnement de test (staging)</span>
          <span class="fr-notice__desc">
            Les données saisies ici ne sont pas envoyées en production et peuvent être effacées à
            tout moment.
          </span>
        </p>
      </div>
    </div>
  </div>
{/if}
