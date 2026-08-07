<script lang="ts">
  import NomEspece from "../../NomEspece.svelte";
  import type { DescriptionImpact, EspeceProtegee } from "@pitchou/types/especes.d.ts";
  type Props = {
    especes: Set<EspeceProtegee>;
    all: Array<{ espèce?: EspeceProtegee; impacts: DescriptionImpact[] }>;
    label: string;
    deleteButtonRefs: HTMLElement[];
    onRemove: (espece: EspeceProtegee) => void;
    compact?: boolean;
  };
  let {
    especes,
    all,
    label,
    deleteButtonRefs = $bindable(),
    onRemove,
    compact = false,
  }: Props = $props();
</script>

<section
  class={compact
    ? "fr-mb-1w [&_ul]:m-0 [&_ul]:list-none [&_li]:p-0! [&_li]:text-[0.9rem]! [&_h4]:text-[1.125rem] [&_h4]:mb-0"
    : "fr-mb-4w"}
>
  {#if compact}<h4>{especes.size} {label}</h4>{:else}<h3 class="fr-mb-3v text-[1.25rem]">
      {especes.size}
      {label}
    </h3>{/if}
  <ul
    class:fr-mt-0={!compact}
    class:fr-mx-0={!compact}
    class:fr-mb-4w={!compact}
    class:list-none={!compact}
  >
    {#each [...especes] as espece (espece)}
      {@const index = all.findIndex(({ espèce }) => espèce === espece)}
      <li class:fr-p-0={!compact} class:text-[0.9rem]!={!compact}>
        <NomEspece espèce={espece} />
        <button
          bind:this={deleteButtonRefs[index]}
          type="button"
          class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline"
          onclick={() => onRemove(espece)}
        >
          Supprimer l'espèce {[...espece.nomsVernaculaires].join(",")}
        </button>
      </li>
    {/each}
  </ul>
</section>
