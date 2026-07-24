<script lang="ts">
  /**
   * @deprecated Use BadgePhase instead.
   */

  import clsx from "clsx";

  import type { MouseEventHandler } from "svelte/elements";
  import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

  // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

  type Size = "SM" | "MD";

  type Props = {
    phase: DossierPhase;
    size?: Size;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    ariaPressed?: boolean | undefined;
    classes?: string[];
  };

  let {
    phase,
    size = "MD",
    onClick = undefined,
    ariaPressed = undefined,
    classes = [],
  }: Props = $props();

  // Filled style (for <p> and pressed <button>): background = phase color, inverted text,
  // ::after (dismiss icon) = phase color, and DSFR's tag background-image killed.
  const phaseToFilledClass = new Map<DossierPhase, string>([
    [
      "Accompagnement amont",
      "bg-[var(--artwork-minor-yellow-tournesol)] text-[color:var(--text-inverted-yellow-tournesol)] bg-none hover:bg-none after:text-[color:var(--artwork-minor-yellow-tournesol)]",
    ],
    [
      "Étude recevabilité DDEP",
      "bg-[var(--background-action-high-orange-terre-battue)] text-[color:var(--text-inverted-orange-terre-battue)] bg-none hover:bg-none after:text-[color:var(--background-action-high-orange-terre-battue)]",
    ],
    [
      "Instruction",
      "bg-[var(--background-flat-blue-cumulus)] text-[color:var(--text-inverted-blue-cumulus)] bg-none hover:bg-none after:text-[color:var(--background-flat-blue-cumulus)]",
    ],
    [
      "Contrôle",
      "bg-[var(--background-flat-pink-tuile)] text-[color:var(--text-inverted-pink-tuile)] bg-none hover:bg-none after:text-[color:var(--background-flat-pink-tuile)]",
    ],
    [
      "Classé sans suite",
      "bg-[var(--background-flat-green-menthe)] text-[color:var(--text-inverted-green-menthe)] bg-none hover:bg-none after:text-[color:var(--background-flat-green-menthe)]",
    ],
    [
      "Obligations terminées",
      "bg-[var(--background-flat-purple-glycine)] text-[color:var(--text-inverted-purple-glycine)] bg-none hover:bg-none after:text-[color:var(--background-flat-purple-glycine)]",
    ],
  ]);

  // Button style: filled when aria-pressed=true, coloured outline when aria-pressed=false.
  // No phase style when aria-pressed is absent (matches the original attribute selectors).
  const phaseToButtonClass = new Map<DossierPhase, string>([
    [
      "Accompagnement amont",
      "aria-[pressed=true]:bg-[var(--artwork-minor-yellow-tournesol)] aria-[pressed=true]:text-[color:var(--text-inverted-yellow-tournesol)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--artwork-minor-yellow-tournesol)] aria-[pressed=false]:text-[color:var(--artwork-minor-yellow-tournesol)] aria-[pressed=false]:[border:1px_solid_var(--artwork-minor-yellow-tournesol)]",
    ],
    [
      "Étude recevabilité DDEP",
      "aria-[pressed=true]:bg-[var(--background-action-high-orange-terre-battue)] aria-[pressed=true]:text-[color:var(--text-inverted-orange-terre-battue)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--background-action-high-orange-terre-battue)] aria-[pressed=false]:text-[color:var(--background-action-high-orange-terre-battue)] aria-[pressed=false]:[border:1px_solid_var(--background-action-high-orange-terre-battue)]",
    ],
    [
      "Instruction",
      "aria-[pressed=true]:bg-[var(--background-flat-blue-cumulus)] aria-[pressed=true]:text-[color:var(--text-inverted-blue-cumulus)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--background-flat-blue-cumulus)] aria-[pressed=false]:text-[color:var(--background-flat-blue-cumulus)] aria-[pressed=false]:[border:1px_solid_var(--background-flat-blue-cumulus)]",
    ],
    [
      "Contrôle",
      "aria-[pressed=true]:bg-[var(--background-flat-pink-tuile)] aria-[pressed=true]:text-[color:var(--text-inverted-pink-tuile)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--background-flat-pink-tuile)] aria-[pressed=false]:text-[color:var(--background-flat-pink-tuile)] aria-[pressed=false]:[border:1px_solid_var(--background-flat-pink-tuile)]",
    ],
    [
      "Classé sans suite",
      "aria-[pressed=true]:bg-[var(--background-flat-green-menthe)] aria-[pressed=true]:text-[color:var(--text-inverted-green-menthe)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--background-flat-green-menthe)] aria-[pressed=false]:text-[color:var(--background-flat-green-menthe)] aria-[pressed=false]:[border:1px_solid_var(--background-flat-green-menthe)]",
    ],
    [
      "Obligations terminées",
      "aria-[pressed=true]:bg-[var(--background-flat-purple-glycine)] aria-[pressed=true]:text-[color:var(--text-inverted-purple-glycine)] aria-[pressed=true]:bg-none aria-[pressed=true]:hover:bg-none aria-[pressed=true]:after:text-[color:var(--background-flat-purple-glycine)] aria-[pressed=false]:text-[color:var(--background-flat-purple-glycine)] aria-[pressed=false]:[border:1px_solid_var(--background-flat-purple-glycine)]",
    ],
  ]);

  const sizeToClass = new Map<Size, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  let pClasses = $derived(
    clsx(
      "fr-tag",
      "whitespace-nowrap",
      sizeToClass.get(size),
      phaseToFilledClass.get(phase),
      classes,
    ),
  );

  let buttonClasses = $derived(
    clsx("fr-tag", sizeToClass.get(size), phaseToButtonClass.get(phase), classes),
  );

  // The DSFR adds its own listeners to handle aria-pressed, but we don't need them,
  // so we disable event propagation to avoid display issues
  const onClickWithDSFROverride: MouseEventHandler<HTMLButtonElement> = (e) => {
    if (onClick) {
      e.stopImmediatePropagation();
      onClick(e);
    }
  };
</script>

{#if typeof onClick === "function"}
  <button
    class={buttonClasses}
    aria-pressed={ariaPressed}
    onclick={onClickWithDSFROverride}
    type="button">{phase}</button
  >
{:else}
  <p class={pClasses}>{phase}</p>
{/if}
