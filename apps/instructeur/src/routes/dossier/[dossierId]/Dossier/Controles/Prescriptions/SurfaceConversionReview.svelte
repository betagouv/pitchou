<script lang="ts">
  import type { SurfaceConversion } from "../decisionAdministrative/errors.ts";
  let { conversions }: { conversions: SurfaceConversion[] } = $props();
</script>

<div class="fr-alert fr-alert--info fr-mt-2w" role="status">
  <p>
    Les surfaces doivent être enregistrées en m². Acceptez ces conversions pour continuer, ou
    retirez le fichier pour le corriger vous-même. Aucune prescription n'a encore été importée.
  </p>
  <ul>
    {#each conversions as conversion}
      <li>
        Prescription {conversion.prescription}, {conversion.column} : {conversion.original}
        → {conversion.squareMetres.toLocaleString("fr-FR")} m²
      </li>
    {/each}
  </ul>
</div>
