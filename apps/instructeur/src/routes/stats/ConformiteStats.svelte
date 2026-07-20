<script lang="ts">
  import type { ConformiteStats } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    conformiteStats: ConformiteStats;
    controllablePrescriptionCount: number;
  };

  let { conformiteStats, controllablePrescriptionCount }: Props = $props();

  const initialConformiteCount = $derived(
    conformiteStats.prescriptionConformeAfterFirstControleCount,
  );
  const returnedToConformiteCount = $derived(conformiteStats.prescriptionReturnedToConformiteCount);
  const nonConformeCount = $derived(conformiteStats.nonConformePrescriptionCount);
  const tooLateCount = $derived(conformiteStats.tooLatePrescriptionCount);
  const otherCount = $derived(
    controllablePrescriptionCount -
      (initialConformiteCount + returnedToConformiteCount + nonConformeCount + tooLateCount),
  );

  const initialConformitePercentage = $derived(
    controllablePrescriptionCount
      ? Math.round((initialConformiteCount / controllablePrescriptionCount) * 100)
      : 0,
  );
  const returnedToConformitePercentage = $derived(
    controllablePrescriptionCount
      ? Math.round((returnedToConformiteCount / controllablePrescriptionCount) * 100)
      : 0,
  );
  const nonConformePercentage = $derived(
    controllablePrescriptionCount
      ? Math.round((nonConformeCount / controllablePrescriptionCount) * 100)
      : 0,
  );
  const tooLatePercentage = $derived(
    controllablePrescriptionCount
      ? Math.round((tooLateCount / controllablePrescriptionCount) * 100)
      : 0,
  );
</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Conformité des prescriptions contrôlables dans Pitchou</h2>
  <div class="fr-card fr-card--no-arrow stat-conformite-card">
    <div class="fr-card__body">
      <div class="fr-card__content">
        <div class="conformite-stats">
          <div class="stat-item conformite-initiale">
            <span class="stat-number">{initialConformiteCount}</span>
            <span class="stat-label">Conformité initiale</span>
          </div>
          <div class="stat-item retour-conformite">
            <span class="stat-number">{returnedToConformiteCount}</span>
            <span class="stat-label">Retour à la conformité</span>
          </div>
          <div class="stat-item non-conforme">
            <span class="stat-number">{nonConformeCount}</span>
            <span class="stat-label">Non conforme</span>
          </div>
          <div class="stat-item trop-tard">
            <span class="stat-number">{tooLateCount}</span>
            <span class="stat-label">Trop tard</span>
          </div>
          <div class="stat-item autre">
            <span class="stat-number">{otherCount}</span>
            <span class="stat-label">Autre</span>
          </div>
        </div>

        <div class="fr-progress-bar fr-mt-2w bar-conformite">
          <div class="conformite-initiale" style:width="{initialConformitePercentage}%"></div>
          <div class="retour-conformite" style:width="{returnedToConformitePercentage}%"></div>
          <div class="non-conforme" style:width="{nonConformePercentage}%"></div>
          <div class="trop-tard" style:width="{tooLatePercentage}%"></div>
        </div>

        <div class="legend-conformite">
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot conformite-initiale"></span>
            <span
              ><strong>Conformité initiale</strong> : Prescription validée dès le 1<sup>er</sup> contrôle.</span
            >
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot retour-conformite"></span>
            <span
              ><strong>Retour à la conformité</strong> : Prescription validée après au moins 2 contrôles.</span
            >
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot non-conforme"></span>
            <span
              ><strong>Non conforme</strong> : Prescription dont le dernier contrôle est "Non conforme".</span
            >
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot trop-tard"></span>
            <span
              ><strong>Trop tard</strong> : Prescription pour laquelle il n'est plus possible de retour
              à la conformité.</span
            >
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot autre"></span>
            <span
              ><strong>Autre</strong> : Pas encore finalisé/manque d'information/non renseigné.</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  $color-conformite-initiale: var(--success-425-625);
  $color-retour-conformite: var(--green-emeraude-950-100-active);
  $color-non-conforme: var(--red-marianne-main-472);
  $color-trop-tard: var(--grey-50-1000);
  $color-autre: var(--text-disabled-grey);

  .stat-conformite-card {
    border: 1.5px solid var(--border-default-grey);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    background: var(--background-default-grey);
    max-width: 100vw;
    margin: 0 -16px 2.5rem -16px;
    padding: 2.5rem 2rem 2rem 2rem;
  }

  .conformite-stats {
    text-align: center;
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 2rem;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.5rem;
      background: none;
      border-radius: 8px;
      margin: 0 0.5rem;
      box-shadow: none;
      min-width: 120px;

      .stat-number {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--text-default-info);
        margin-bottom: 0.25rem;
        letter-spacing: 0.01em;
      }

      &.conformite-initiale .stat-number {
        color: $color-conformite-initiale;
      }
      &.retour-conformite .stat-number {
        color: $color-retour-conformite;
      }
      &.non-conforme .stat-number {
        color: $color-non-conforme;
      }
      &.trop-tard .stat-number {
        color: $color-trop-tard;
      }
      &.autre .stat-number {
        color: $color-autre;
      }

      .stat-label {
        font-size: 1rem;
        color: var(--text-mention-grey);
        margin-top: 0.15rem;
        font-weight: 500;
      }
    }
  }

  .bar-conformite {
    display: flex;
    margin: 1.5rem 0 2rem 0;
    box-shadow: none;
    background: $color-autre;
    border-radius: 8px;

    height: 1.5rem;

    & > div {
      height: 100%;
      transition: width 0.5s;
    }

    .conformite-initiale {
      background: $color-conformite-initiale;
    }
    .retour-conformite {
      background: $color-retour-conformite;
    }
    .non-conforme {
      background: $color-non-conforme;
    }
    .trop-tard {
      background: $color-trop-tard;
    }
  }

  .legend-conformite {
    font-size: small;

    .legend-conformite-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.5rem;
      border: 2px solid var(--border-default-grey);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

      &.conformite-initiale {
        background: $color-conformite-initiale;
      }
      &.retour-conformite {
        background: $color-retour-conformite;
      }
      &.non-conforme {
        background: $color-non-conforme;
      }
      &.trop-tard {
        background: $color-trop-tard;
      }
      &.autre {
        background: $color-autre;
      }
    }
  }

  @media (max-width: 900px) {
    .stat-conformite-card {
      padding: 1.5rem 0.5rem 1rem 0.5rem;
      margin: 0 -8px 1.5rem -8px;
    }
    .stat-item {
      min-width: 90px;
      padding: 0.75rem 0.25rem;
    }
  }
</style>
