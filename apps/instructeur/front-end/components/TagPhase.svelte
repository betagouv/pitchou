<script lang="ts">
  /**
   * @deprecated Utiliser BadgePhase à la place.
   */

  import type { MouseEventHandler } from "svelte/elements";
  import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";

  // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

  type Taille = "SM" | "MD";

  type Props = {
    phase: DossierPhase;
    taille?: Taille;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    ariaPressed?: boolean | undefined;
    classes?: string[];
  };

  let {
    phase,
    taille = "MD",
    onClick = undefined,
    ariaPressed = undefined,
    classes = [],
  }: Props = $props();

  const phaseToClass = new Map<DossierPhase, string>([
    ["Accompagnement amont", "phase--accompagnement-amont"],
    ["Étude recevabilité DDEP", "phase--étude-recevabilité"],
    ["Instruction", "phase--instruction"],
    ["Contrôle", "phase--contrôle"],
    ["Classé sans suite", "phase--classé-sans-suite"],
    ["Obligations terminées", "phase--obligations-terminées"],
  ]);

  const tailleToClass = new Map<Taille, string>([
    ["SM", "fr-tag--sm"],
    ["MD", "fr-tag--md"],
  ]);

  let allClasses = $derived(
    ["fr-tag", tailleToClass.get(taille), phaseToClass.get(phase), ...classes].filter((x) => !!x),
  );

  // Le DSFR rajoute ses propres listeners pour gérer les aria-pressed, mais on n'en a pas besoin
  // alors, on désactive la propagation des évènements pour éviter des problèmes d'affichage
  const onClickWithDSFROverride: MouseEventHandler<HTMLButtonElement> = (e) => {
    if (onClick) {
      e.stopImmediatePropagation();
      onClick(e);
    }
  };
</script>

{#if typeof onClick === "function"}
  <button
    class={allClasses.join(" ")}
    aria-pressed={ariaPressed}
    onclick={onClickWithDSFROverride}
    type="button">{phase}</button
  >
{:else}
  <p class={allClasses.join(" ")}>{phase}</p>
{/if}

<style lang="scss">
  $couleur-phase-accompagnement-amont: var(--artwork-minor-yellow-tournesol);
  $couleur-phase-étude-recevabilité: var(--background-action-high-orange-terre-battue);
  $couleur-phase-instruction: var(--background-flat-blue-cumulus);
  $couleur-phase-contrôle: var(--background-flat-pink-tuile);
  $couleur-phase-classé-sans-suite: var(--background-flat-green-menthe);
  $couleur-phase-obligations-terminées: var(--background-flat-purple-glycine);

  p {
    white-space: nowrap;
  }

  p,
  button.fr-tag[aria-pressed="true"] {
    // DSFR override
    &,
    &:hover {
      background-image: none;
    }

    &.phase--accompagnement-amont {
      background-color: $couleur-phase-accompagnement-amont;
      color: var(--text-inverted-yellow-tournesol);

      &::after {
        color: $couleur-phase-accompagnement-amont;
      }
    }
    &.phase--étude-recevabilité {
      background-color: $couleur-phase-étude-recevabilité;
      color: var(--text-inverted-orange-terre-battue);

      &::after {
        color: $couleur-phase-étude-recevabilité;
      }
    }
    &.phase--instruction {
      background-color: $couleur-phase-instruction;
      color: var(--text-inverted-blue-cumulus);

      &::after {
        color: $couleur-phase-instruction;
      }
    }
    &.phase--contrôle {
      background-color: $couleur-phase-contrôle;
      color: var(--text-inverted-pink-tuile);

      &::after {
        color: $couleur-phase-contrôle;
      }
    }
    &.phase--classé-sans-suite {
      background-color: $couleur-phase-classé-sans-suite;
      color: var(--text-inverted-green-menthe);

      &::after {
        color: $couleur-phase-classé-sans-suite;
      }
    }
    &.phase--obligations-terminées {
      background-color: $couleur-phase-obligations-terminées;
      color: var(--text-inverted-purple-glycine);

      &::after {
        color: $couleur-phase-obligations-terminées;
      }
    }
  }

  button.fr-tag[aria-pressed="false"] {
    &.phase--accompagnement-amont {
      color: $couleur-phase-accompagnement-amont;
      border: 1px solid $couleur-phase-accompagnement-amont;
    }
    &.phase--étude-recevabilité {
      color: $couleur-phase-étude-recevabilité;
      border: 1px solid $couleur-phase-étude-recevabilité;
    }
    &.phase--instruction {
      color: $couleur-phase-instruction;
      border: 1px solid $couleur-phase-instruction;
    }
    &.phase--contrôle {
      color: $couleur-phase-contrôle;
      border: 1px solid $couleur-phase-contrôle;
    }
    &.phase--classé-sans-suite {
      color: $couleur-phase-classé-sans-suite;
      border: 1px solid $couleur-phase-classé-sans-suite;
    }
    &.phase--obligations-terminées {
      color: $couleur-phase-obligations-terminées;
      border: 1px solid $couleur-phase-obligations-terminées;
    }
  }
</style>
