<script lang="ts">
  import type { TaxrefRow } from "@pitchou/ui/taxref/taxrefList.ts";
  let {
    rows,
    existingCdRefs,
    loading,
    onSelect,
  }: {
    rows: TaxrefRow[];
    existingCdRefs: Set<string>;
    loading: boolean;
    onSelect: (row: TaxrefRow) => void;
  } = $props();
  let hoveredCdNom = $state<string | null>(null);
</script>

<div
  class="fr-table fr-table--bordered fr-table--layout-fixed overflow-x-auto [&.loading]:opacity-50 [&.loading]:[transition:opacity_0.15s_ease]"
  class:loading
>
  <table class="w-full">
    <colgroup
      ><col style="width: 100px" /><col style="width: 100px" /><col /><col /><col
        style="width: 110px"
      /><col style="width: 110px" /></colgroup
    >
    <thead
      ><tr
        ><th scope="col">CD_NOM</th><th scope="col">CD_REF</th><th scope="col">Nom scientifique</th
        ><th scope="col">Nom vernaculaire</th><th scope="col">Règne</th><th scope="col">Classe</th
        ></tr
      ></thead
    >
    <tbody>
      {#each rows as row (row.id)}
        {@const alreadyListed = existingCdRefs.has(row.cd_ref)}
        <tr
          class="[&.clickable]:cursor-pointer [&.clickable.hovered]:bg-[var(--background-contrast-grey)] [&.clickable]:focus-visible:[outline:2px_solid_var(--bf500)] [&.clickable]:focus-visible:[outline-offset:-2px] [&.no-bottom-line]:bg-none"
          class:clickable={!alreadyListed}
          class:hovered={hoveredCdNom === row.cd_nom}
          class:no-bottom-line={alreadyListed}
          role={alreadyListed ? undefined : "button"}
          tabindex={alreadyListed ? undefined : 0}
          title={alreadyListed ? "Déjà une espèce protégée" : "Ajouter ce taxon"}
          onmouseenter={() => (hoveredCdNom = row.cd_nom)}
          onmouseleave={() => (hoveredCdNom = null)}
          onclick={() => !alreadyListed && onSelect(row)}
          onkeydown={(event) => {
            if (!alreadyListed && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onSelect(row);
            }
          }}
        >
          <td>{row.cd_nom}</td><td>{row.cd_ref}</td><td><i>{row.lb_nom}</i></td><td
            >{row.nom_vern}</td
          ><td>{row.regne}</td><td>{row.classe}</td>
        </tr>
        {#if alreadyListed}<tr class="[&_td]:pt-0 [&_td]:pb-3" aria-hidden="true"
            ><td colspan="6"
              ><span class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon"
                >Déjà une espèce protégée</span
              ></td
            ></tr
          >{/if}
      {/each}
    </tbody>
  </table>
</div>
