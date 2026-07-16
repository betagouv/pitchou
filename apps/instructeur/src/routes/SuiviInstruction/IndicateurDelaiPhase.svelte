<script lang="ts">
  import { differenceInMonths, differenceInWeeks, addMonths, format } from "date-fns";
  import IndicateurDelai from "./IndicateurDelai.svelte";
  import { getDebutPhaseActuelle } from "$lib/dossier/getDebutPhaseActuelle.ts";

  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierSummary;
  };

  let { dossier }: Props = $props();

  let debutPhaseActuelle = $derived(getDebutPhaseActuelle(dossier));
  let monthDiff = $derived(differenceInMonths(new Date(), debutPhaseActuelle.dateDébut));
  //$: console.log('monthDiff', monthDiff)
  // the +1 is to get a pessimistic delay
  let weekDiff = $derived(
    differenceInWeeks(new Date(), addMonths(debutPhaseActuelle.dateDébut, monthDiff)) + 1,
  );
  // $: console.log('weekDiff', weekDiff)

  let quantite = $derived(monthDiff + weekDiff / 4);
  let alt = $derived(
    `depuis ${format(debutPhaseActuelle.dateDébut, "yyyy-MM-dd")} - ~${monthDiff} mois`,
  );
</script>

{#if debutPhaseActuelle.phase === "Instruction"}
  <IndicateurDelai
    quantité={quantite}
    style={quantite >= 3 ? "erreur" : quantite >= 2 ? "avertissement" : "info"}
    {alt}
  ></IndicateurDelai>
{:else}
  <IndicateurDelai quantité={quantite} style="info" {alt}></IndicateurDelai>
{/if}
