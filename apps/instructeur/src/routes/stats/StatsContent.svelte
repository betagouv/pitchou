<script lang="ts">
  import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";
  import ConformiteStats from "./ConformiteStats.svelte";
  import PrescriptionStats from "./PrescriptionStats.svelte";
  import BiodiversiteImpactStats from "./BiodiversiteImpactStats.svelte";

  type Props = {
    stats: PublicStats;
  };

  let { stats }: Props = $props();

  const estimatedAnnualPetitionnaireCountInFrance = 1500;

  const withDecisionPercentage = $derived(
    stats.controlePhaseDossierCount
      ? Math.round(
          (stats.controlePhaseDossierWithDecisionCount / stats.controlePhaseDossierCount) * 100,
        )
      : 0,
  );
  const withoutDecisionPercentage = $derived(
    stats.controlePhaseDossierCount ? 100 - withDecisionPercentage : 0,
  );
</script>

<div class="fr-grid-row fr-mt-6w fr-grid-row--center">
  <article class="fr-col">
    <header class="fr-mb-2w">
      <h1>Pitchou - Statistiques publiques</h1>
      <p class="fr-text--lg fr-mb-0">
        Ces données statistiques reposent sur un total de <strong
          >{stats.dossierCount} dossiers
        </strong> enregistrés dans la base de données Pitchou.
      </p>
    </header>

    <section class="fr-mb-4w">
      <h2 class="fr-mt-2w">Utilisation de Pitchou depuis septembre 2024</h2>
      <div
        class="border-[1.5px] border-[color:var(--border-default-grey)] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[var(--background-default-grey)] max-w-[100vw] mt-0 mx-[-16px] mb-10 pt-[2.5rem] px-8 pb-8 max-[900px]:pt-6 max-[900px]:px-2 max-[900px]:pb-4 max-[900px]:mt-0 max-[900px]:mx-[-8px] max-[900px]:mb-6 fr-card fr-card--no-arrow"
      >
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--gutters">
              <div class="fr-col-6">
                <div
                  class="flex flex-col items-center text-center fr-p-2w rounded-[6px] bg-[var(--background-action-high-blue-france)] text-white"
                >
                  <span class="text-[2rem] fr-text--bold block text-white"
                    >{stats.petitionnaireCountSinceSeptember2024}</span
                  >
                  <span class="text-[0.875rem] fr-mt-1v text-white"
                    >Pétitionnaires dans Pitchou<br /><span class="fr-text--xs"
                      >(depuis 09/2024)</span
                    ></span
                  >
                </div>
              </div>
              <div class="fr-col-6">
                <div
                  class="flex flex-col items-center text-center fr-p-2w rounded-[6px] bg-[var(--background-alt-grey)]"
                >
                  <span
                    class="text-[2rem] fr-text--bold block text-[color:var(--text-default-info)]"
                    >{estimatedAnnualPetitionnaireCountInFrance}</span
                  >
                  <span class="text-[0.875rem] fr-mt-1v text-[color:var(--text-mention-grey)]"
                    >Pétitionnaires en France<br /><span class="fr-text--xs">(référence)</span
                    ></span
                  >
                </div>
              </div>
            </div>
            <p class="fr-text--sm fr-mt-2w">
              Ces chiffres correspondent à l'activité sur Pitchou depuis septembre 2024.
              L'estimation France entière est indicative.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="fr-mt-2w">
        Dossiers en phase <strong>Contrôle</strong> : avec ou sans décision administrative
      </h2>
      <div
        class="border-[1.5px] border-[color:var(--border-default-grey)] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[var(--background-default-grey)] max-w-[100vw] mt-0 mx-[-16px] mb-10 pt-[2.5rem] px-8 pb-8 max-[900px]:pt-6 max-[900px]:px-2 max-[900px]:pb-4 max-[900px]:mt-0 max-[900px]:mx-[-8px] max-[900px]:mb-6 fr-card fr-card--no-arrow"
      >
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="flex flex-col gap-4 fr-mb-2w">
              <div
                class="bg-[var(--background-alt-grey)] rounded-[8px] fr-p-2w border border-[color:var(--border-default-grey)] fr-mb-3v"
              >
                <strong class="fr-text--bold text-[color:var(--text-default-info)]"
                  >Qu'est-ce qu'une décision administrative&nbsp;?</strong
                ><br />
                <span class="text-[0.95rem] text-[color:var(--text-mention-grey)] fr-mt-1w"
                  >Une décision administrative correspond à un arrêté de dérogation, un arrêté de
                  refus, un arrêté modificatif ou tout autre document administratif finalisant
                  l'instruction du dossier.</span
                >
              </div>
            </div>
            <div class="w-full fr-mt-4w fr-mx-0 fr-mb-2w">
              <div class="flex justify-between items-center fr-mb-1w">
                <div class="flex flex-col items-center text-[1rem]">
                  <span
                    class="text-[2rem] fr-text--bold block text-[color:var(--text-default-info)]"
                    >{stats.controlePhaseDossierWithDecisionCount}</span
                  >
                  <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
                    >Avec décision<br />{withDecisionPercentage}%</span
                  >
                </div>
                <div class="flex flex-col items-center text-[1rem]">
                  <span
                    class="text-[2rem] fr-text--bold block text-[color:var(--text-mention-grey)]"
                    >{stats.controlePhaseDossierWithoutDecisionCount}</span
                  >
                  <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
                    >Sans décision<br />{withoutDecisionPercentage}%</span
                  >
                </div>
              </div>
              <div
                class="fr-progress-bar fr-mt-2w"
                style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden;"
              >
                <div
                  style="width: {withDecisionPercentage}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
                ></div>
                <div
                  style="width: {withoutDecisionPercentage}%; background: var(--background-contrast-grey); height: 100%; display: inline-block;"
                ></div>
              </div>
              <div class="text-center fr-mt-1w">
                <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
                  >Total dossiers en phase Contrôle : <strong
                    >{stats.controlePhaseDossierCount}</strong
                  ></span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <PrescriptionStats {stats} />

    <ConformiteStats
      conformiteStats={stats.conformiteStats}
      controllablePrescriptionCount={stats.controllablePrescriptionCount}
    />
    <BiodiversiteImpactStats stats={stats.biodiversiteImpactStats} />
  </article>
</div>
