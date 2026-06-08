<script lang="ts">
  import type { NiveauAARRI } from "$types/API_Pitchou.ts";
  import { NIVEAU_LABELS } from "./utilisateursList.ts";

  type Props = {
    niveau: NiveauAARRI;
  };

  let { niveau }: Props = $props();

  // One DSFR system colour per funnel stage.
  const NIVEAU_BADGE_CLASS: Record<NiveauAARRI, string> = {
    base: "fr-badge--grey",
    acquis: "fr-badge--blue-ecume",
    actif: "fr-badge--green-tilleul-verveine",
    retenu: "fr-badge--purple-glycine",
    impact: "fr-badge--green-emeraude",
  };
</script>

<p class="fr-badge fr-badge--sm {NIVEAU_BADGE_CLASS[niveau]}">{NIVEAU_LABELS[niveau]}</p>
