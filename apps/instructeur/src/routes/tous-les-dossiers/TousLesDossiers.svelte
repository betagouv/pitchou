<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { ComponentProps } from "svelte";
  import Squelette from "$lib/components/Squelette.svelte";
  import ListeDossiers from "$lib/components/ListeDossiers/ListeDossiers.svelte";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    erreurs?: PitchouState["erreurs"];
    résultatsSynchronisationDS88444: ComponentProps<
      typeof Squelette
    >["résultatsSynchronisationDS88444"];
    notificationParDossier?: PitchouState["notificationParDossier"];
  };

  let {
    email = "",
    dossiers,
    relationSuivis,
    erreurs = new Set(),
    résultatsSynchronisationDS88444,
    notificationParDossier = new SvelteMap(),
  }: Props = $props();
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Tous les dossiers">
  <ListeDossiers
    titre="Tous les dossiers"
    {email}
    {dossiers}
    {relationSuivis}
    {notificationParDossier}
    afficherFiltreSansInstructeurice
  />
</Squelette>
