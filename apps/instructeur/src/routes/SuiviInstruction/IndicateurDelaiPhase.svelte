<script lang="ts">
  import { differenceInMonths, differenceInWeeks, addMonths, format } from "date-fns";
  import IndicateurDelai from "./IndicateurDelai.svelte";
  import { getCurrentPhaseStart } from "$lib/dossier/getCurrentPhaseStart.ts";

  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierSummary;
  };

  let { dossier }: Props = $props();

  let currentPhaseStart = $derived(getCurrentPhaseStart(dossier));
  let monthDiff = $derived(differenceInMonths(new Date(), currentPhaseStart.startDate));
  //$: console.log('monthDiff', monthDiff)
  // the +1 is to get a pessimistic delay
  let weekDiff = $derived(
    differenceInWeeks(new Date(), addMonths(currentPhaseStart.startDate, monthDiff)) + 1,
  );
  // $: console.log('weekDiff', weekDiff)

  let quantity = $derived(monthDiff + weekDiff / 4);
  let alt = $derived(
    `depuis ${format(currentPhaseStart.startDate, "yyyy-MM-dd")} - ~${monthDiff} mois`,
  );
</script>

{#if currentPhaseStart.phase === "Instruction"}
  <IndicateurDelai
    quantity={quantity}
    style={quantity >= 3 ? "error" : quantity >= 2 ? "warning" : "info"}
    {alt}
  ></IndicateurDelai>
{:else}
  <IndicateurDelai quantity={quantity} style="info" {alt}></IndicateurDelai>
{/if}
