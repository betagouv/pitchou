<script lang="ts">
  import type { IndicateursAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { untrack } from "svelte";
  import Loader from "$lib/components/Loader.svelte";
  import AARRIEvolutionChart from "./AARRIEvolutionChart.svelte";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { isSameDay } from "date-fns";
  import MatriceImpact from "./MatriceImpact.svelte";

  type Props = {
    indicateursParDateP: Promise<IndicateursAARRI[]>;
  };

  let { indicateursParDateP }: Props = $props();

  let indicateursAujourdhuiP = $derived(
    indicateursParDateP.then((indicateursParDate) => indicateursParDate[0]),
  );

  // typing intentionally loose: the value can be Date (from the option) or "" (default option)
  let dateDebut: any = $state();
  let dateFin: any = $state();

  // Default comparison: from the earliest snapshot to today (the two extremes).
  untrack(() => indicateursParDateP).then((indicateursParDate) => {
    if (indicateursParDate.length > 0) {
      dateFin = indicateursParDate[0].date;
      dateDebut = indicateursParDate[indicateursParDate.length - 1].date;
    }
  });

  const largeurBarreBase = 80;

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
    if (change > 0) return "evolution-positive";
    if (change < 0) return "evolution-negative";
    return "evolution-neutral";
  }
</script>

<div class="fr-my-6w">
  <h1>Suivi des indicateurs AARRI</h1>

  {#await indicateursAujourdhuiP}
    <Loader></Loader>
  {:then indicateursAujourdhui}
    <section class="fr-mt-4w">
      <h2>État des lieux</h2>
      <p>
        Voici la valeur des nombres d'utilisateurices de Pitchou pour chaque phase AARRI
        aujourd'hui.
      </p>
      <div class="bars-container">
        <div class="fr-grid-row fr-grid-row--middle">
          <span class="fr-col-1">Impact</span>
          <div
            class="bar bar-impact"
            style={`width:${(indicateursAujourdhui.nombreUtilisateuriceImpact / indicateursAujourdhui.nombreBaseUtilisateuricePotentielle) * largeurBarreBase}%`}
          ></div>
          <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceImpact}</span>
        </div>
        <div class="fr-grid-row fr-grid-row--middle">
          <span class="fr-col-1">Retenu</span>
          <div
            class="bar bar-retenu"
            style={`width:${(indicateursAujourdhui.nombreUtilisateuriceRetenu / indicateursAujourdhui.nombreBaseUtilisateuricePotentielle) * largeurBarreBase}%`}
          ></div>
          <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceRetenu}</span>
        </div>
        <div class="fr-grid-row fr-grid-row--middle">
          <span class="fr-col-1">Activé</span>
          <div
            class="bar bar-actif"
            style={`width:${(indicateursAujourdhui.nombreUtilisateuriceActif / indicateursAujourdhui.nombreBaseUtilisateuricePotentielle) * largeurBarreBase}%`}
          ></div>
          <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceActif}</span>
        </div>
        <div class="fr-grid-row fr-grid-row--middle">
          <span class="fr-col-1">Acquis</span>
          <div
            class="bar bar-acquis"
            style={`width:${(indicateursAujourdhui.nombreUtilisateuriceAcquis / indicateursAujourdhui.nombreBaseUtilisateuricePotentielle) * largeurBarreBase}%`}
          ></div>
          <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceAcquis}</span>
        </div>
        <div class="fr-grid-row fr-grid-row--middle">
          <span class="fr-col-1">Base</span>
          <div class="bar bar-base" style={`width:${largeurBarreBase}%`}></div>
          <span class="fr-ml-1w">{indicateursAujourdhui.nombreBaseUtilisateuricePotentielle}</span>
        </div>
      </div>
    </section>
    <section class="fr-mt-4w">
      <h2>Notre démarche</h2>
      <h3>Cible d'utilisateurices potentiel.les</h3>
      <p>
        Le nombre de personnes qui instruisent et interviennent dans le cadre de la dérogation
        espèce protégée est fluctuant. On l'estime à 300.
      </p>
      <h3>Acquisition</h3>
      <p>
        Une personne acquise est une personne qui suite à une rencontre (webinaire, mail, échange)
        s’est connectée pour la première fois à pitchou.beta.gouv.fr.
      </p>
      <h3>Activation</h3>
      <p>
        Une personne activée est une personne qui a effectué 5 actions de modifications
        (principalement des modifications de dossier) sur une période de 7 jours.
      </p>
      <h3>Rétention</h3>
      <p>
        Une personne est passée en rétention (on dira qu'elle est régulièrement active) lorsqu'elle
        a fait des actions de modification et de consultation très régulièrement. On le traduit
        comme suit : la personne a renouvelé 5 actions de consultation ou de modification sur 7
        jours glissants sur les 5 dernières semaines.
      </p>
      <h3>Impact</h3>
      <p>
        Pitchou vise à avoir un réel impact sur la biodiversité. Cet impact se mesure grâce à la
        surface d'habitat et à la population d'une espèce. À ce niveau, on mesure le nombre
        d'utilisateurices ayant fait au moins un contrôle qui produit un retour à la conformité.
      </p>
    </section>
    {#await indicateursParDateP}
      <Loader></Loader>
    {:then indicateursParDate}
      {@const toutesLesDates = [...indicateursParDate]
        .map((indicateurs) => indicateurs.date)
        .sort((a, b) => +new Date(a) - +new Date(b))}
      {@const datesDebutPossibles = toutesLesDates.filter(
        (date) => !dateFin || +new Date(date) <= +new Date(dateFin),
      )}
      {@const datesFinPossibles = toutesLesDates.filter(
        (date) => !dateDebut || +new Date(date) >= +new Date(dateDebut),
      )}
      {@const indicateurDebut = indicateursParDate.find((indicateurs) =>
        isSameDay(indicateurs.date, dateDebut),
      )}
      {@const indicateurFin = indicateursParDate.find((indicateurs) =>
        isSameDay(indicateurs.date, dateFin),
      )}
      {@const evolutionRows = [
        {
          phase: "Acquis",
          color: "var(--artwork-minor-brown-caramel)",
          before: indicateurDebut?.nombreUtilisateuriceAcquis,
          after: indicateurFin?.nombreUtilisateuriceAcquis,
        },
        {
          phase: "Activé",
          color: "var(--artwork-minor-green-menthe)",
          before: indicateurDebut?.nombreUtilisateuriceActif,
          after: indicateurFin?.nombreUtilisateuriceActif,
        },
        {
          phase: "Retenu",
          color: "var(--artwork-minor-yellow-moutarde)",
          before: indicateurDebut?.nombreUtilisateuriceRetenu,
          after: indicateurFin?.nombreUtilisateuriceRetenu,
        },
        {
          phase: "Impact",
          color: "var(--artwork-minor-red-marianne)",
          before: indicateurDebut?.nombreUtilisateuriceImpact,
          after: indicateurFin?.nombreUtilisateuriceImpact,
        },
      ]}
      <MatriceImpact />
      <section class="fr-mt-4w">
        <h2>Évolution</h2>
        <p>
          Évolution du nombre d'utilisateurices par phase AARRI depuis le premier évènement
          enregistré.
        </p>

        <AARRIEvolutionChart indicateurs={indicateursParDate} />

        <h3 class="fr-mt-4w">Évolution du nombre d'utilisateurice par phase entre deux dates</h3>

        <div class="dates-comparison">
          <div class="fr-select-group">
            <label class="fr-label" for="select-debut">De</label>
            <select bind:value={dateDebut} class="fr-select" id="select-debut" name="select-debut">
              {#each datesDebutPossibles as date}
                <option value={date}>{formatDateAbsolute(date)}</option>
              {/each}
            </select>
          </div>
          <div class="fr-select-group">
            <label class="fr-label" for="select-fin">à</label>
            <select bind:value={dateFin} class="fr-select" id="select-fin" name="select-fin">
              {#each datesFinPossibles as date}
                <option value={date}>{formatDateAbsolute(date)}</option>
              {/each}
            </select>
          </div>
        </div>

        {#if indicateurDebut && indicateurFin}
          <div class="fr-table" id="table-0-component">
            <div class="fr-table__wrapper">
              <div class="fr-table__container">
                <div class="fr-table__content">
                  <table id="table-0">
                    <caption class="fr-sr-only">
                      Évolution du nombre d'utilisateurice par phase entre {formatDateAbsolute(
                        dateDebut,
                      )} et {formatDateAbsolute(dateFin)}
                    </caption>
                    <thead>
                      <tr>
                        <th>Phase</th>
                        <th>{formatDateAbsolute(dateDebut)}</th>
                        <th>{formatDateAbsolute(dateFin)}</th>
                        <th>Évolution</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each evolutionRows as row, i}
                        {@const change = (row.after ?? 0) - (row.before ?? 0)}
                        <tr id={`table-0-row-key-${i + 1}`} data-row-key={i + 1}>
                          <td>
                            <span class="phase-dot" style={`background-color:${row.color}`}></span>
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
    {/await}
  {/await}
</div>

<style lang="scss">
  $color-base: var(--artwork-minor-blue-ecume);
  $color-acquis: var(--artwork-minor-brown-caramel);
  $color-actif: var(--artwork-minor-green-menthe);
  $color-retenu: var(--artwork-minor-yellow-moutarde);
  $color-impact: var(--artwork-minor-red-marianne);

  .bars-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .phase-dot {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    margin-right: 0.5rem;
    vertical-align: middle;
  }
  .dates-comparison {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.5rem;
    margin-bottom: 1.5rem;

    .fr-select-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0;
    }
    .fr-label {
      margin-bottom: 0;
      white-space: nowrap;
    }
    .fr-select {
      margin-top: 0;
      width: auto;
      min-width: 11rem;
    }
  }
  .evolution-positive {
    color: var(--text-default-success, #18753c);
    font-weight: 700;
  }
  .evolution-negative {
    color: var(--text-default-error, #ce0500);
    font-weight: 700;
  }
  .evolution-neutral {
    color: var(--text-mention-grey, #666);
  }
  .bar {
    height: 40px;
    &.bar-base {
      background-color: $color-base;
    }
    &.bar-acquis {
      background-color: $color-acquis;
    }
    &.bar-actif {
      background-color: $color-actif;
    }
    &.bar-retenu {
      background-color: $color-retenu;
    }
    &.bar-impact {
      background-color: $color-impact;
    }
  }
</style>
