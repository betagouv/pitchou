<script lang="ts">
  import { store } from "$front/store.svelte.ts";
  import Squelette from "$front/components/Squelette.svelte";

  import BdcStatutsListe from "./BdcStatutsListe.svelte";

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
</script>

<Squelette
  {email}
  nav={Boolean(email)}
  title="BDC-Statuts"
  {erreurs}
  {résultatsSynchronisationDS88444}
>
  <BdcStatutsListe />
</Squelette>
