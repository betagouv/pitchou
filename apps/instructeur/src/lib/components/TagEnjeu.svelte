<script lang="ts">
  // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

  type Enjeu = "écologique" | "politique";
  type Taille = "SM" | "MD";

  type Props = {
    enjeu: Enjeu;
    taille?: Taille;
    classes?: string[];
  };

  let { enjeu, taille = "MD", classes = [] }: Props = $props();

  const enjeuToClass = new Map<Enjeu, string>([
    ["écologique", "enjeu--écologique"],
    ["politique", "enjeu--politique"],
  ]);

  const tailleToClass = new Map<Taille, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  let allClasses = $derived(
    ["fr-tag", tailleToClass.get(taille), enjeuToClass.get(enjeu), ...classes].filter((x) => !!x),
  );
</script>

<p class={allClasses.join(" ")}>{enjeu}</p>

<style lang="scss">
  $couleur-enjeu-écologique: var(--background-flat-green-emeraude);
  $couleur-enjeu-politique: var(--background-flat-blue-ecume);

  p {
    white-space: nowrap;
  }

  p {
    &.enjeu--écologique {
      background-color: $couleur-enjeu-écologique;
      color: var(--text-inverted-blue-ecume);
    }
    &.enjeu--politique {
      background-color: $couleur-enjeu-politique;
      color: var(--text-inverted-green-emeraude);
    }
  }
</style>
