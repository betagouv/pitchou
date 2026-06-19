<script lang="ts">
  import SaisieEspèces from "./SaisieEspèces.svelte";
  import {
    importDescriptionMenacesEspècesFromOdsArrayBuffer,
    importDescriptionMenacesEspècesFromURL,
  } from "@pitchou/common/outils-espèces.ts";
  import {
    chargerListeEspècesProtégées,
    chargerActivitésMéthodesMoyensDePoursuite,
  } from "$lib/especes/activitésMéthodesMoyensDePoursuite.ts";

  const initP = Promise.all([
    chargerListeEspècesProtégées(),
    chargerActivitésMéthodesMoyensDePoursuite(),
  ]);
</script>

{#await initP then [espècesData, actMétTrans]}
  {@const { espècesProtégéesParClassification, espèceByCD_REF } = espècesData}
  {@const {
    activités: activitesParClassificationEtreVivant,
    méthodes: méthodesParClassificationEtreVivant,
    moyensDePoursuite: transportsParClassificationEtreVivant,
  } = actMétTrans}
  {@const etresVivantsAtteints = importDescriptionMenacesEspècesFromURL(
    new URL(location.href),
    espèceByCD_REF,
    activitesParClassificationEtreVivant,
    méthodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  )}
  <SaisieEspèces
    {espècesProtégéesParClassification}
    {activitesParClassificationEtreVivant}
    {méthodesParClassificationEtreVivant}
    {transportsParClassificationEtreVivant}
    importDescriptionMenacesEspècesFromOds={(odsAB) =>
      importDescriptionMenacesEspècesFromOdsArrayBuffer(
        odsAB,
        espèceByCD_REF,
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
      )}
    oiseauxAtteints={(etresVivantsAtteints && etresVivantsAtteints["oiseau"]) || []}
    faunesNonOiseauxAtteintes={(etresVivantsAtteints && etresVivantsAtteints["faune non-oiseau"]) ||
      []}
    floresAtteintes={(etresVivantsAtteints && etresVivantsAtteints["flore"]) || []}
  />
{/await}
