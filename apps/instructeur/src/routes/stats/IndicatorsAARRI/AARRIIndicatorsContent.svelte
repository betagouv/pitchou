<script lang="ts">
  import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { isSameDay } from "date-fns";
  import AARRIEvolutionChart from "./AARRIEvolutionChart.svelte";
  import MatrixImpact from "./MatrixImpact.svelte";
  import AARRICurrentState from "./AARRICurrentState.svelte";

  let {
    indicatorsByDate,
    startDate = $bindable(),
    endDate = $bindable(),
  }: {
    indicatorsByDate: IndicatorsAARRI[];
    startDate: IndicatorsAARRI["date"] | undefined;
    endDate: IndicatorsAARRI["date"] | undefined;
  } = $props();

  // Default to the earliest and latest snapshots until the user selects dates.
  untrack(() => {
    startDate ??= indicatorsByDate.at(-1)?.date;
    endDate ??= indicatorsByDate[0]?.date;
  });

  const allDates = $derived(
    [...indicatorsByDate]
      .map((indicators) => indicators.date)
      .sort((a, b) => +new Date(a) - +new Date(b)),
  );
  const possibleStartDates = $derived(
    allDates
      .filter((date) => !endDate || +new Date(date) <= +new Date(endDate))
      .map((date) => ({ value: date, label: formatDateAbsolute(date) })),
  );
  const possibleEndDates = $derived(
    allDates
      .filter((date) => !startDate || +new Date(date) >= +new Date(startDate))
      .map((date) => ({ value: date, label: formatDateAbsolute(date) })),
  );
  const startIndicator = $derived(
    indicatorsByDate.find((indicators) => startDate && isSameDay(indicators.date, startDate)),
  );
  const endIndicator = $derived(
    indicatorsByDate.find((indicators) => endDate && isSameDay(indicators.date, endDate)),
  );
  const evolutionRows = $derived([
    {
      phase: "Acquis",
      color: "var(--artwork-minor-brown-caramel)",
      before: startIndicator?.nombreUtilisateuriceAcquis,
      after: endIndicator?.nombreUtilisateuriceAcquis,
    },
    {
      phase: "Activé",
      color: "var(--artwork-minor-green-menthe)",
      before: startIndicator?.nombreUtilisateuriceActif,
      after: endIndicator?.nombreUtilisateuriceActif,
    },
    {
      phase: "Retenu",
      color: "var(--artwork-minor-yellow-moutarde)",
      before: startIndicator?.nombreUtilisateuriceRetenu,
      after: endIndicator?.nombreUtilisateuriceRetenu,
    },
    {
      phase: "Impact",
      color: "var(--artwork-minor-red-marianne)",
      before: startIndicator?.nombreUtilisateuriceImpact,
      after: endIndicator?.nombreUtilisateuriceImpact,
    },
  ]);
  function formatEvolution(change: number): string {
    return change > 0 ? `+${change}` : `${change}`;
  }

  function evolutionArrow(change: number): string {
    if (change > 0) return "↗";
    if (change < 0) return "↘";
    return "→";
  }

  function formatPercent(before: number | undefined, change: number): string {
    // A percentage from a zero (or unknown) baseline is undefined.
    if (!before) return "—";
    const percent = Math.round((change / before) * 100);
    return `${percent > 0 ? "+" : ""}${percent} %`;
  }

  function changeClass(change: number): string {
    if (change > 0) return "text-[color:var(--text-default-success,#18753c)] font-bold";
    if (change < 0) return "text-[color:var(--text-default-error,#ce0500)] font-bold";
    return "text-[color:var(--text-mention-grey,#666)]";
  }
</script>

<AARRICurrentState indicators={indicatorsByDate[0]} />
<MatrixImpact />
<section class="fr-mt-4w">
  <h2>Évolution</h2>
  <p>
    Évolution du nombre d'utilisateurices par phase AARRI depuis le premier évènement enregistré.
  </p>

  <AARRIEvolutionChart indicators={indicatorsByDate} />

  <h3 class="fr-mt-4w">Évolution du nombre d'utilisateurice par phase entre deux dates</h3>

  <div class="flex flex-wrap items-center gap-[0.5rem_1.5rem] fr-mb-3w">
    <div class="fr-select-group flex items-center gap-2 fr-mb-0">
      <label class="fr-label fr-mb-0 whitespace-nowrap" for="select-debut">De</label>
      <Select
        id="select-debut"
        class="w-auto min-w-[11rem]"
        options={possibleStartDates}
        bind:value={startDate}
      />
    </div>
    <div class="fr-select-group flex items-center gap-2 fr-mb-0">
      <label class="fr-label fr-mb-0 whitespace-nowrap" for="select-fin">à</label>
      <Select
        id="select-fin"
        class="w-auto min-w-[11rem]"
        options={possibleEndDates}
        bind:value={endDate}
      />
    </div>
  </div>

  {#if startDate && endDate && startIndicator && endIndicator}
    <div class="fr-table" id="table-0-component">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table id="table-0">
              <caption class="fr-sr-only">
                Évolution du nombre d'utilisateurice par phase entre {formatDateAbsolute(startDate)} et
                {formatDateAbsolute(endDate)}
              </caption>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>{formatDateAbsolute(startDate)}</th>
                  <th>{formatDateAbsolute(endDate)}</th>
                  <th>Évolution</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {#each evolutionRows as row, i}
                  {@const change = (row.after ?? 0) - (row.before ?? 0)}
                  <tr id={`table-0-row-key-${i + 1}`} data-row-key={i + 1}>
                    <td>
                      <span
                        class="inline-block w-3 h-3 rounded-full fr-mr-1w align-middle"
                        style={`background-color:${row.color}`}
                      ></span>
                      {row.phase}
                    </td>
                    <td>{row.before}</td>
                    <td>{row.after}</td>
                    <td class={changeClass(change)}>
                      {evolutionArrow(change)}
                      {formatEvolution(change)}
                    </td>
                    <td class={changeClass(change)}>
                      {formatPercent(row.before, change)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>
