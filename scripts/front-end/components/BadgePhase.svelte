<script lang="ts">
  import type { DossierPhase } from "../../types/API_Pitchou.ts";

  type Props = {
    phase: DossierPhase;
  };

  let { phase }: Props = $props();

  const classParPhase = new Map<DossierPhase, string>([
    ["Accompagnement amont", "fr-badge--yellow-tournesol"],
    ["Étude recevabilité DDEP", "fr-badge--yellow-moutarde"],
    ["Instruction", "fr-badge--blue-cumulus"],
    ["Contrôle", "fr-badge--orange-terre-battue"],
    ["Classé sans suite", ""],
    ["Obligations terminées", "fr-badge--beige-gris-galet"],
  ]);
</script>

<p class="fr-badge fr-badge--sm {classParPhase.get(phase)}">{phase}</p>
