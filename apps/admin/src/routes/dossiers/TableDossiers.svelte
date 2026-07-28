<script lang="ts">
  import type { AdminDossierSummary } from "$lib/actions/adminDossiers.ts";

  type Props = {
    rows: AdminDossierSummary[];
  };

  let { rows }: Props = $props();

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  function formatDemandeur(dossier: AdminDossierSummary): string {
    if (dossier.demandeur_entreprise) return dossier.demandeur_entreprise;
    const name = [dossier.demandeur_last_name, dossier.demandeur_first_names]
      .filter(Boolean)
      .join(" ");
    return name || "—";
  }
</script>

<div class="fr-table fr-table--bordered fr-table--layout-fixed">
  <table>
    <colgroup>
      <col />
      <col style="width: 12rem" />
      <col style="width: 11rem" />
      <col style="width: 7rem" />
      <col style="width: 10rem" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Dossier</th>
        <th scope="col">Demandeur</th>
        <th scope="col">Phase</th>
        <th scope="col">Dépôt</th>
        <th scope="col">Source</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as dossier (dossier.id)}
        <tr>
          <td>
            <a href="/dossiers/{dossier.id}">{dossier.name || `Dossier ${dossier.id}`}</a>
            {#if dossier.groupe_name}
              <p class="fr-text--xs fr-text-mention--grey fr-mb-0">{dossier.groupe_name}</p>
            {/if}
          </td>
          <td>{formatDemandeur(dossier)}</td>
          <td>{dossier.phase}</td>
          <td>{formatDate(dossier.depot_date)}</td>
          <td>
            {#if dossier.demarche_numerique_number}
              <span class="fr-badge fr-badge--info fr-badge--sm fr-badge--no-icon">
                DN nº{dossier.demarche_numerique_number}
              </span>
            {:else}
              <span class="fr-badge fr-badge--green-emeraude fr-badge--sm">Pitchou</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
