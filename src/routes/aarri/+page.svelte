<script lang="ts">
  import { store } from "$front/store.svelte.ts";
  import AARRI from "$front/components/screens/AARRI.svelte";
  import { chargerIndicateursAARRI } from "$front/actions/aarri.ts";

  const indicateursParDateP = chargerIndicateursAARRI();

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
</script>

<AARRI {email} {erreurs} {résultatsSynchronisationDS88444} {indicateursParDateP} />
