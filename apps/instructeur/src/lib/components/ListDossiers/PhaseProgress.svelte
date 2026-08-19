<script lang="ts">
  import { phaseProgress } from "@pitchou/common/phases.ts";
  import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    phase: DossierPhase;
  };

  let { phase }: Props = $props();

  const percentage = $derived(Math.round(phaseProgress(phase) * 100));
</script>

<div class="flex min-w-0 flex-col gap-2">
  <span class="font-bold leading-tight">{phase}</span>
  <span
    class="block h-2 w-full rounded-full bg-[var(--background-contrast-grey)]"
    role="progressbar"
    aria-label={`Avancement du dossier : ${phase}`}
    aria-valuenow={percentage}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <span
      class="block h-full rounded-full bg-[var(--background-action-high-success)]"
      style:width={`${percentage}%`}
    ></span>
  </span>
</div>
