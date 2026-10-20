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
    if (otherNomsVernaculaires.length > 0) {
      let t = otherNomsVernaculaires.join(", ");
      if (otherNomsScientifiques.length > 0) {
        t += " | " + otherNomsScientifiques.join(", ");
      }
      return t;
    } else if (otherNomsScientifiques.length > 0) {
      return otherNomsScientifiques.join(", ");
    }
  });
</script>

<span {title}>
  {#if firstNomVernaculaire}
    {firstNomVernaculaire} (<i>{firstNomScientifique}</i>)
  {:else}
    <i>{firstNomScientifique}</i>
  {/if}
</span>
