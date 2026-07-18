<script lang="ts">
  import clsx from "clsx";

  import type { ResultatControle } from "@pitchou/types/API_Pitchou.ts";

  // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

  type Size = "SM" | "MD";

  type Props = {
    result: ResultatControle | string;
    size?: Size;
    classes?: string[];
  };

  let { result, size = "SM", classes = [] }: Props = $props();

  const resultatToClass = new Map<ResultatControle, string>([
    ["Conforme", "result--conforme"],
    ["Non conforme", "result--non-conforme"],
    ["Non conforme (Pas d'informations reçues)", "result--non-conforme-pas-information"],
    ["En cours", "result--en-cours"],
    ["Trop tard", "result--trop-tard"],
  ]);

  const sizeToClass = new Map<Size, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  let allClasses = $derived([
    "fr-tag",
    sizeToClass.get(size),
    resultatToClass.get(result as ResultatControle) || "result--autre",
    ...classes,
  ]);
</script>

<p class={clsx(allClasses)}>{result}</p>

<style lang="scss">
  $conforme-result-color: var(--background-flat-success);
  $non-conforme-result-color: var(--background-flat-error);
  $other-result-color: var(--background-flat-beige-gris-galet);

  p {
    // DSFR override
    &,
    &:hover {
      background-image: none;
    }

    &.result--en-cours,
    &.result--trop-tard,
    &.result--autre {
      background-color: $other-result-color;
      color: var(--text-inverted-beige-gris-galet);
    }

    &.result--conforme {
      background-color: $conforme-result-color;
      color: var(--text-inverted-success);
    }

    &.result--non-conforme,
    &.result--non-conforme-pas-information {
      background-color: $non-conforme-result-color;
      color: var(--text-inverted-error);
    }
  }
</style>
