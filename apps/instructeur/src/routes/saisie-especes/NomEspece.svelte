<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

  type Props = {
    espèce: EspeceProtegee;
  };

  let { espèce: espece }: Props = $props();

  let premierNomVernaculaire = $derived([...espece.nomsVernaculaires][0]);
  let autresNomsVernaculaires = $derived([...espece.nomsVernaculaires].slice(1));
  let premierNomScientifique = $derived([...espece.nomsScientifiques][0]);
  let autresNomsScientifiques = $derived([...espece.nomsScientifiques].slice(1));

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
