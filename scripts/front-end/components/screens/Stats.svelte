<script lang="ts">
  import Loader from "../Loader.svelte";
  import Squelette from "../Squelette.svelte";
  import StatsContenu from "../stats/StatsContenu.svelte";

  import type { ComponentProps } from "svelte";
  import type { StatsPubliques } from "../../../types/API_Pitchou.ts";

  type Props = {
    statsP: Promise<StatsPubliques>;
    email?: string | undefined;
    erreurs: ComponentProps<typeof Squelette>["erreurs"];
  };

  let { statsP, email = undefined, erreurs }: Props = $props();
</script>

<Squelette {email} nav={false} {erreurs}>
  {#await statsP}
    <Loader></Loader>
  {:then stats}
    <StatsContenu {stats} />
  {:catch error}
    <div class="fr-alert fr-alert--error fr-mb-3w">
      <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des statistiques :</h3>
      <p>{error.message}</p>
    </div>
  {/await}
</Squelette>

<style lang="scss">
</style>
