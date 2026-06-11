<script lang="ts">
  import type { ModificationEspeceAdmin } from "$front/actions/adminEspeces.ts";

  import {
    displayedNom,
    effectiveClassification,
    effectiveStatuts,
  } from "./adminModificationsList.ts";

  type Props = {
    rows: ModificationEspeceAdmin[];
    onSelect: (modification: ModificationEspeceAdmin) => void;
  };

  let { rows, onSelect }: Props = $props();

  function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("fr-FR");
  }
</script>

<div class="fr-table fr-table--bordered fr-table--layout-fixed">
  <table>
    <colgroup>
      <col style="width: 6rem" />
      <col />
      <col style="width: 9rem" />
      <col style="width: 9rem" />
      <col style="width: 9rem" />
      <col />
      <col style="width: 7rem" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">CD_REF</th>
        <th scope="col">Nom</th>
        <th scope="col">Classification</th>
        <th scope="col">Statuts</th>
        <th scope="col">Drapeaux</th>
        <th scope="col">Modifié par</th>
        <th scope="col">Mis à jour</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as modification (modification.cd_ref)}
        <tr
          class="clickable"
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
          <td>{modification.cd_ref}</td>
          <td><i>{displayedNom(modification)}</i></td>
          <td>{effectiveClassification(modification) ?? "—"}</td>
          <td>{effectiveStatuts(modification).join(", ") || "—"}</td>
          <td>
            {#if modification.espece_cnpn}
              <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</p>
            {/if}
            {#if modification.espece_ministerielle}
              <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</p>
            {/if}
            {#if modification.exclu}
              <p class="fr-badge fr-badge--sm fr-badge--error">Exclue</p>
            {/if}
          </td>
          <td>{modification.modifie_par ?? "—"}</td>
          <td>{formatDate(modification.updated_at)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="scss">
  .fr-table {
    overflow-x: auto;
  }

  .fr-table table {
    width: 100%;
  }

  tr.clickable {
    cursor: pointer;
  }

  tr.clickable:hover {
    background-color: var(--background-contrast-grey);
  }

  tr.clickable:focus-visible {
    outline: 2px solid var(--bf500);
    outline-offset: -2px;
  }
</style>
