<script lang="ts">
  import clsx from "clsx";

  import type { ResultatControle } from "@pitchou/types/API_Pitchou.ts";

  // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

  type Size = "SM" | "MD";

  type Props = {
    résultatControle: ResultatControle | string;
    size?: Size;
    classes?: string[];
  };

  let { résultatControle: resultatControle, size = "SM", classes = [] }: Props = $props();

  const resultatToClass = new Map<ResultatControle, string>([
    ["Conforme", "résultat--conforme"],
    ["Non conforme", "résultat--non-conforme"],
    ["Non conforme (Pas d'informations reçues)", "résultat--non-conforme-pas-information"],
    ["En cours", "résultat--en-cours"],
    ["Trop tard", "résultat--trop-tard"],
  ]);

  const sizeToClass = new Map<Size, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  let allClasses = $derived([
    "fr-tag",
    sizeToClass.get(size),
    resultatToClass.get(resultatControle as ResultatControle) || "résultat--autre",
    ...classes,
  ]);
</script>

<p class={clsx(allClasses)}>{resultatControle}</p>

<style lang="scss">
  $couleur-résultat-contrôle-conforme: var(--background-flat-success);
  $couleur-résultat-contrôle-non-conforme: var(--background-flat-error);
  $couleur-résultat-contrôle-autre: var(--background-flat-beige-gris-galet);

  p {
    // DSFR override
    &,
    &:hover {
      background-image: none;
    }

    &.résultat--en-cours,
    &.résultat--trop-tard,
    &.résultat--autre {
      background-color: $couleur-résultat-contrôle-autre;
      color: var(--text-inverted-beige-gris-galet);
    }

    &.résultat--conforme {
      background-color: $couleur-résultat-contrôle-conforme;
      color: var(--text-inverted-success);
    }

    &.résultat--non-conforme,
    &.résultat--non-conforme-pas-information {
      background-color: $couleur-résultat-contrôle-non-conforme;
      color: var(--text-inverted-error);
    }
  }
</style>
