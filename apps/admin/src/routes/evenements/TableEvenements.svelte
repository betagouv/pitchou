<script lang="ts">
  import type { EvenementMetriqueRow } from "$lib/actions/adminEvenements.ts";

  type Props = {
    rows: EvenementMetriqueRow[];
  };

  let { rows }: Props = $props();

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  function formatDetails(details: unknown): string {
    if (details === null || details === undefined) return "";
    return typeof details === "object" ? JSON.stringify(details) : String(details);
  }
</script>

<div class="fr-table fr-table--bordered fr-table--layout-fixed">
  <table>
    <colgroup>
      <col style="width: 8rem" />
      <col />
      <col />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Utilisateur</th>
        <th scope="col">Évènement</th>
        <th scope="col">Détails</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as evenement (evenement.id)}
        {@const details = formatDetails(evenement.details)}
        <tr>
          <td>{formatDate(evenement.date)}</td>
          <td>{evenement.email ?? "—"}</td>
          <td>{evenement.evenement}</td>
          <td class="truncate font-[monospace] text-[0.875rem]" title={details}>{details}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
