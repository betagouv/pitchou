<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  import { firstName } from "@pitchou/ui/especes/especesList.ts";
  let {
    especes,
    existingCdRefs,
    onSelect,
  }: {
    especes: EspeceProtegee[];
    existingCdRefs: Set<string>;
    onSelect: (espece: EspeceProtegee) => void;
  } = $props();
  let hoveredCdRef = $state<string | null>(null);
</script>

<div class="fr-table fr-table--bordered fr-table--layout-fixed overflow-x-auto">
  <table class="w-full">
    <colgroup><col /><col /><col style="width: 7rem" /><col style="width: 6rem" /></colgroup>
    <thead
      ><tr
        ><th scope="col">Nom scientifique</th><th scope="col">Nom vernaculaire</th><th scope="col"
          >Statuts</th
        ><th scope="col">CD_REF</th></tr
      ></thead
    >
    <tbody>
      {#each especes as espece (espece.CD_REF)}
        {@const alreadyListed = existingCdRefs.has(espece.CD_REF)}
        <tr
          class="cursor-pointer [&.hovered]:bg-[var(--background-contrast-grey)] [&.already-listed_i]:text-[color:var(--text-mention-grey)] [&.no-bottom-line]:bg-none focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
          class:already-listed={alreadyListed}
          class:hovered={hoveredCdRef === espece.CD_REF}
          class:no-bottom-line={alreadyListed}
          role="button"
          tabindex="0"
          title={alreadyListed
            ? "Déjà dans la liste — cliquer pour la modifier"
            : "Choisir cette espèce"}
          onmouseenter={() => (hoveredCdRef = espece.CD_REF)}
          onmouseleave={() => (hoveredCdRef = null)}
          onclick={() => onSelect(espece)}
          onkeydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(espece);
            }
          }}
        >
          <td><i>{firstName(espece.nomsScientifiques)}</i></td><td
            >{firstName(espece.nomsVernaculaires)}</td
          ><td>{[...espece.CD_TYPE_STATUTS].join(", ")}</td><td>{espece.CD_REF}</td>
        </tr>
        {#if alreadyListed}
          <tr
            class="cursor-pointer [&.hovered]:bg-[var(--background-contrast-grey)] [&_td]:pt-0 [&_td]:pb-3"
            class:hovered={hoveredCdRef === espece.CD_REF}
            aria-hidden="true"
            onmouseenter={() => (hoveredCdRef = espece.CD_REF)}
            onmouseleave={() => (hoveredCdRef = null)}
            onclick={() => onSelect(espece)}
          >
            <td colspan="4"
              ><span class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon"
                >Déjà dans la liste</span
              ></td
            >
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
</div>
