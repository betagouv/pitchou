<script lang="ts">
  import type { EspèceProtégée } from "../../types/especes.d.ts";

  type Props = {
    espèce: EspèceProtégée;
  };

  let { espèce }: Props = $props();

  let premierNomVernaculaire = $derived([...espèce.nomsVernaculaires][0]);
  let autresNomsVernaculaires = $derived([...espèce.nomsVernaculaires].slice(1));
  let premierNomScientifique = $derived([...espèce.nomsScientifiques][0]);
  let autresNomsScientifiques = $derived([...espèce.nomsScientifiques].slice(1));

  let title: string | undefined = $derived.by(() => {
    if (autresNomsVernaculaires.length >= 1) {
      let t = autresNomsVernaculaires.join(", ");
      if (autresNomsScientifiques.length >= 1) {
        t += " | " + autresNomsScientifiques.join(", ");
      }
      return t;
    } else if (autresNomsScientifiques.length >= 1) {
      return autresNomsScientifiques.join(", ");
    }
    return undefined;
  });
</script>

<span {title}>
  {premierNomVernaculaire} (<i>{premierNomScientifique}</i>)
</span>

<style lang="scss">
</style>
