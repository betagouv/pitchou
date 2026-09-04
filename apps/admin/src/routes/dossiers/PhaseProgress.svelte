<script lang="ts">
  import { phaseProgress } from "@pitchou/common/phases.ts";
  import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    // The admin summary carries the phase as a plain string; an unknown value
    // simply reports a full progression (phaseProgress's fallback).
    // Null means no phase event was recorded, which no progression describes.
    phase: string | null;
  };

  let { phase }: Props = $props();

  const label = $derived(phase ?? "Non renseignée");
  const percentage = $derived(
    phase === null ? 0 : Math.round(phaseProgress(phase as DossierPhase) * 100),
  );
</script>

<div class="flex min-w-0 flex-col gap-2">
  <span class="font-bold leading-tight">{label}</span>
  <span
    class="block h-2 w-full rounded-full bg-[var(--background-contrast-grey)]"
    role="progressbar"
    aria-label={`Avancement du dossier : ${label}`}
    aria-valuenow={percentage}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <span class="block h-full rounded-full bg-[#61CE8C]" style:width={`${percentage}%`}></span>
  </span>
</div>
