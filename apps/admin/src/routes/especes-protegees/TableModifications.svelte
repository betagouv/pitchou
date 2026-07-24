<script lang="ts">
  import type { ModificationEspeceAdmin } from "$lib/actions/adminEspeces.ts";

  import {
    effectiveNomsScientifiques,
    effectiveNomsVernaculaires,
    effectiveClassification,
    effectiveStatuts,
  } from "./adminModificationsList.ts";

  type Props = {
    rows: ModificationEspeceAdmin[];
    onSelect: (modification: ModificationEspeceAdmin) => void;
  };

  let { rows, onSelect }: Props = $props();
</script>

<div class="fr-table fr-table--bordered fr-table--layout-fixed overflow-x-auto">
  <table class="w-full min-w-[48rem]">
    <colgroup>
      <col />
      <col />
      <col style="width: 9rem" />
      <col style="width: 9rem" />
      <col style="width: 6rem" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Nom scientifique</th>
        <th scope="col">Nom vernaculaire</th>
        <th scope="col">Classification</th>
        <th scope="col">Statuts</th>
        <th scope="col">CD_REF</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as modification (modification.cd_ref)}
        {@const nomsScientifiques = effectiveNomsScientifiques(modification)}
        {@const nomsVernaculaires = effectiveNomsVernaculaires(modification)}
        <tr
          class="cursor-pointer hover:bg-[var(--background-contrast-grey)] focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
          role="button"
          tabindex="0"
          title="Modifier cette espèce"
          onclick={() => onSelect(modification)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(modification);
            }
          }}
        >
          <td>
            {#if modification.espece_cnpn}
              <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</p>
            {/if}
            {#if modification.espece_ministerielle}
              <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</p>
            {/if}
            {#if modification.excluded}
              <p class="fr-badge fr-badge--sm fr-badge--error">Exclue</p>
            {/if}
            <i>{nomsScientifiques[0] ?? "—"}</i>
            {#if nomsScientifiques.length > 1}
              <span class="fr-badge fr-badge--sm" title={nomsScientifiques.slice(1).join(", ")}>
                +{nomsScientifiques.length - 1}
              </span>
            {/if}
          </td>
          <td>{nomsVernaculaires[0] ?? "—"}</td>
          <td>{effectiveClassification(modification) ?? "—"}</td>
          <td>{effectiveStatuts(modification).join(", ") || "—"}</td>
          <td>{modification.cd_ref}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
