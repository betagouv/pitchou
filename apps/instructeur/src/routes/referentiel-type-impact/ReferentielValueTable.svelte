<script lang="ts">
  import type {
    MethodeRow,
    MoyenDePoursuiteRow,
  } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";
  type Props = {
    title: string;
    description: string;
    emptyMessage: string;
    values: (MethodeRow | MoyenDePoursuiteRow)[];
    onOpen: (value: MethodeRow | MoyenDePoursuiteRow, nature: string) => void;
  };
  let { title, description, emptyMessage, values, onOpen }: Props = $props();
</script>

<h2 class="fr-h4 fr-mt-4w">{title} <span class="fr-text--sm">({values.length})</span></h2>
<p>{description}</p>
{#if values.length === 0}
  <p class="fr-mb-0">{emptyMessage}</p>
{:else}
  <div class="fr-table fr-table--bordered overflow-x-auto">
    <table class="w-full min-w-[36rem]">
      <colgroup><col style="width: 110px" /><col style="width: 150px" /><col /></colgroup>
      <thead
        ><tr
          ><th scope="col">Code européen</th><th scope="col">Classification</th><th scope="col"
            >Libellé Pitchou</th
          ></tr
        ></thead
      >
      <tbody>
        {#each values as value (value.classification + value.code)}
          <tr
            class="cursor-pointer hover:bg-[var(--background-contrast-grey)] focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
            role="button"
            tabindex="0"
            title="Voir le détail de {value.code}"
            onclick={() => onOpen(value, title === "Méthodes" ? "Méthode" : "Moyen de poursuite")}
            onkeydown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(value, title === "Méthodes" ? "Méthode" : "Moyen de poursuite");
              }
            }}
          >
            <td>{value.code}</td><td>{value.classification}</td><td>{value.libelle_pitchou}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
