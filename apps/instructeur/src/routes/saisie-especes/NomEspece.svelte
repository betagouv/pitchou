<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

  type Props = {
    espèce: EspeceProtegee;
  };

  let { espèce: espece }: Props = $props();

  let firstNomVernaculaire = $derived([...espece.nomsVernaculaires][0]);
  let otherNomsVernaculaires = $derived([...espece.nomsVernaculaires].slice(1));
  let firstNomScientifique = $derived([...espece.nomsScientifiques][0]);
  let otherNomsScientifiques = $derived([...espece.nomsScientifiques].slice(1));

  let title: string | undefined = $derived.by(() => {
    if (otherNomsVernaculaires.length >= 1) {
      let t = otherNomsVernaculaires.join(", ");
      if (otherNomsScientifiques.length >= 1) {
        t += " | " + otherNomsScientifiques.join(", ");
      }
      return t;
    } else if (otherNomsScientifiques.length >= 1) {
      return otherNomsScientifiques.join(", ");
    }
    return undefined;
  });
</script>

<span {title}>
  {firstNomVernaculaire} (<i>{firstNomScientifique}</i>)
</span>

<style lang="scss">
</style>
