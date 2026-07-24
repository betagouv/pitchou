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

  const conformeClasses =
    "bg-[var(--background-flat-success)] text-[color:var(--text-inverted-success)]";
  const nonConformeClasses =
    "bg-[var(--background-flat-error)] text-[color:var(--text-inverted-error)]";
  const otherClasses =
    "bg-[var(--background-flat-beige-gris-galet)] text-[color:var(--text-inverted-beige-gris-galet)]";

  const resultatToClass = new Map<ResultatControle, string>([
    ["Conforme", conformeClasses],
    ["Non conforme", nonConformeClasses],
    ["Non conforme (Pas d'informations reçues)", nonConformeClasses],
    ["En cours", otherClasses],
    ["Trop tard", otherClasses],
  ]);

  const sizeToClass = new Map<Size, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  // `bg-none hover:bg-none` overrides the DSFR tag background image.
  let allClasses = $derived([
    "fr-tag",
    "bg-none hover:bg-none",
    sizeToClass.get(size),
    resultatToClass.get(result as ResultatControle) || otherClasses,
    ...classes,
  ]);
</script>

<p class={clsx(allClasses)}>{result}</p>
