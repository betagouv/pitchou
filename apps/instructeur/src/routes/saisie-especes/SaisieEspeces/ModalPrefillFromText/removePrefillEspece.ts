import { tick } from "svelte";
import type { DescriptionImpact, EspeceProtegee } from "@pitchou/types/especes.d.ts";

export async function removePrefillEspece(
  espece: EspeceProtegee,
  impacted: Array<{ espèce?: EspeceProtegee; impacts: DescriptionImpact[] }>,
  remove: (index: number) => void,
  buttonRefs: HTMLElement[],
  fallback?: HTMLElement,
) {
  const index = impacted.findIndex(({ espèce }) => espèce === espece);
  if (index < 0) return;
  remove(index);
  await tick();
  if (!impacted.length) return fallback?.focus();
  const nextIndex = index === impacted.length ? index - 1 : index;
  const nextEspece = impacted[nextIndex]?.espèce;
  const nextButton = buttonRefs.find(
    (ref, refIndex) => ref && impacted[refIndex]?.espèce === nextEspece,
  );
  (nextButton ?? fallback)?.focus();
}
