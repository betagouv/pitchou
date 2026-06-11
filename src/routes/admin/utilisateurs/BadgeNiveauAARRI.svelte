<script lang="ts">
  import type { NiveauAARRI } from "$types/API_Pitchou.ts";
  import { NIVEAU_LABELS, NIVEAU_COLOR_VAR } from "./utilisateursList.ts";

  type Props = {
    niveau: NiveauAARRI;
  };

  let { niveau }: Props = $props();
</script>

<p class="fr-badge fr-badge--sm" style="background-color: {NIVEAU_COLOR_VAR[niveau]}; color: #fff;">
  {NIVEAU_LABELS[niveau]}
</p>
