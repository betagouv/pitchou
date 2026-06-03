<script lang="ts">
  import { store } from "$front/store.svelte.ts";
  import Stats from "$front/components/screens/Stats.svelte";
  import { chargerStats } from "$front/actions/stats.ts";

  const statsP = chargerStats();

  const email = $derived(store.identité?.email);
  const erreurs = $derived(store.erreurs);
</script>

<Stats {email} {erreurs} {statsP} />
