<script lang="ts">
  import SaisieEspeces from "./SaisieEspeces.svelte";
  import {
    importDescriptionMenacesEspecesFromOdsArrayBuffer,
    importDescriptionMenacesEspecesFromURL,
  } from "@pitchou/common/especesUtils.ts";
  import {
    loadEspecesProtegeesList,
    loadActivitesMethodesMoyensDePoursuite,
  } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";

  const initP = Promise.all([loadEspecesProtegeesList(), loadActivitesMethodesMoyensDePoursuite()]);
</script>

{#await initP then [especesData, actMetTrans]}
  {@const {
    espècesProtégéesParClassification: especesProtegeesParClassification,
    espèceByCD_REF: especeByCD_REF,
  } = especesData}
  {@const {
    activités: activitesParClassificationEtreVivant,
    méthodes: methodesParClassificationEtreVivant,
    moyensDePoursuite: transportsParClassificationEtreVivant,
  } = actMetTrans}
  {@const etresVivantsAtteints = importDescriptionMenacesEspecesFromURL(
    new URL(location.href),
    especeByCD_REF,
    activitesParClassificationEtreVivant,
    methodesParClassificationEtreVivant,
    transportsParClassificationEtreVivant,
  )}
  <SaisieEspeces
    espècesProtégéesParClassification={especesProtegeesParClassification}
    {activitesParClassificationEtreVivant}
    méthodesParClassificationEtreVivant={methodesParClassificationEtreVivant}
    {transportsParClassificationEtreVivant}
    importDescriptionMenacesEspècesFromOds={(odsAB) =>
      importDescriptionMenacesEspecesFromOdsArrayBuffer(
        odsAB,
        especeByCD_REF,
        activitesParClassificationEtreVivant,
        methodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
      )}
    oiseauxAtteints={(etresVivantsAtteints && etresVivantsAtteints["oiseau"]) || []}
    faunesNonOiseauxAtteintes={(etresVivantsAtteints && etresVivantsAtteints["faune non-oiseau"]) ||
      []}
    floresAtteintes={(etresVivantsAtteints && etresVivantsAtteints["flore"]) || []}
  />
{/await}
