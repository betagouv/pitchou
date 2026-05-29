<script lang="ts">
  import type { DossierRésumé } from "../../../types/API_Pitchou.ts";
  import type { PitchouState } from "../../store.svelte.ts";
  import type { ComponentProps } from "svelte";

  import Squelette from "../Squelette.svelte";
  import ListeDossiers from "../ListeDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    erreurs?: PitchouState["erreurs"];
    résultatsSynchronisationDS88444: ComponentProps<
      typeof Squelette
    >["résultatsSynchronisationDS88444"];
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let {
    email = "",
    dossiers = [],
    relationSuivis,
    erreurs = new Set(),
    résultatsSynchronisationDS88444,
    notificationParDossier,
  }: Props = $props();
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444} title="Mes dossiers">
  <ListeDossiers
    titre="Mes dossiers"
    {email}
    {dossiers}
    {relationSuivis}
    afficherFiltreActionInstructeur
    {notificationParDossier}
  />
</Squelette>
