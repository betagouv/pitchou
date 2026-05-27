<script>
  //@ts-check

  /** @import {EspèceProtégée} from '../../types/especes.d.ts' */

  /**
   * @typedef {Object} Props
   * @property {EspèceProtégée} espèce
   */

  /** @type {Props} */
  let { espèce } = $props();

  let premierNomVernaculaire = $derived([...espèce.nomsVernaculaires][0]);
  let autresNomsVernaculaires = $derived([...espèce.nomsVernaculaires].slice(1));
  let premierNomScientifique = $derived([...espèce.nomsScientifiques][0]);
  let autresNomsScientifiques = $derived([...espèce.nomsScientifiques].slice(1));

  /** @type {string | undefined} */
  let title = $derived.by(() => {
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
