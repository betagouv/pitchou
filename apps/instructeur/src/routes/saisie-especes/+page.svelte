<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import SaisieEspèces from "$lib/components/screens/SaisieEspèces.svelte";
  import {
    importDescriptionMenacesEspècesFromOdsArrayBuffer,
    importDescriptionMenacesEspècesFromURL,
  } from "@pitchou/common/outils-espèces.ts";
  import {
    chargerListeEspècesProtégées,
    chargerActivitésMéthodesMoyensDePoursuite,
  } from "$lib/actions/activitésMéthodesMoyensDePoursuite.ts";

  const initP = Promise.all([
    chargerListeEspècesProtégées(),
    chargerActivitésMéthodesMoyensDePoursuite(),
  ]);

  const email = $derived(store.identité?.email);
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
    {email}
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
