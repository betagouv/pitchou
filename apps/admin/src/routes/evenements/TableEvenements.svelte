<script lang="ts">
  import { tick } from "svelte";
  import ListTable from "$lib/components/ListTable.svelte";
  import EventDetailsModal from "./EventDetailsModal.svelte";
  import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";
  import type { EvenementMetriqueRow } from "$lib/actions/adminEvenements.ts";

  type Props = {
    total: number;
    rows: EvenementMetriqueRow[];
  };

  let { total, rows }: Props = $props();
  let selected = $state<EvenementMetriqueRow | null>(null);
  let selectedRow: HTMLTableRowElement | null = null;

  function showDetails(evenement: EvenementMetriqueRow, row: HTMLTableRowElement) {
    selectedRow = row;
    selected = evenement;
  }

  async function closeDetails() {
    selected = null;
    await tick();
    selectedRow?.focus();
  }

  function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    // Events predating the horodatage only carry a day.
    return isTimeOfDayKnown(date)
      ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      : date.toLocaleDateString("fr-FR");
  }

  function formatDetails(details: unknown): string {
    if (details === null || details === undefined) return "";
    return typeof details === "object" ? JSON.stringify(details) : String(details);
  }
</script>

<ListTable title="Évènements" count={total}>
  <table>
    <colgroup>
      <col style="width: 12rem" />
      <col />
      <col />
      <col />
      <col style="width: 3rem" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Utilisateur</th>
        <th scope="col">Évènement</th>
        <th scope="col">Détails</th>
        <th scope="col"><span class="sr-only">Consulter</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as evenement (evenement.id)}
        {@const details = formatDetails(evenement.details)}
        <tr
          class="cursor-pointer"
          role="button"
          tabindex="0"
          aria-haspopup="dialog"
          aria-label={`Voir ${evenement.evenement} du ${formatDate(evenement.date)}, ${evenement.email ?? "utilisateur inconnu"}`}
          onclick={(event) => showDetails(evenement, event.currentTarget)}
          onkeydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              showDetails(evenement, event.currentTarget);
            }
          }}
        >
          <td class="whitespace-nowrap">{formatDate(evenement.date)}</td>
          <td>{evenement.email ?? "—"}</td>
          <td>{evenement.evenement}</td>
          <td class="truncate font-[monospace] text-[0.875rem]" title={details}>{details}</td>
          <td
            ><span
              class="fr-icon-arrow-right-s-line fr-icon--sm text-[var(--text-action-high-blue-france)]"
              aria-hidden="true"
            ></span></td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</ListTable>

{#if selected}
  <EventDetailsModal
    evenement={selected}
    date={formatDate(selected.date)}
    onClose={() => void closeDetails()}
  />
{/if}
