<script lang="ts">
  import { env } from "$env/dynamic/public";

  // Imports a shared lib to prove cross-package sharing works from a second app.
  import { retirerAccents } from "@pitchou/common/manipulationStrings.ts";

  const demo = retirerAccents("Dérogation espèces protégées");

  // Link back to the public app. Hidden when unset.
  const siteUrlPitchou = env.PUBLIC_SITE_URL_PITCHOU;
</script>

<h1>Pitchou — Admin</h1>
<p>Application admin (squelette).</p>
<p>Shared code check (@pitchou/common): <code>{demo}</code></p>

{#if siteUrlPitchou}
  <p>
    <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href={siteUrlPitchou}>
      Aller sur Pitchou
    </a>
  </p>
{/if}
