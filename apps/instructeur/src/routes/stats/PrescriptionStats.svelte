<script lang="ts">
  import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";
  type Props = { stats: PublicStats };
  let { stats }: Props = $props();
  const controlledPercentage = $derived(
    stats.controllablePrescriptionCount > 0
      ? Math.round(
          (stats.prescriptionWithControleCount / stats.controllablePrescriptionCount) * 100,
        )
      : 0,
  );
</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Prescriptions et contrôles réalisés dans Pitchou</h2>
  <div
    class="border-[1.5px] border-[color:var(--border-default-grey)] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[var(--background-default-grey)] max-w-[100vw] mt-0 mx-[-16px] mb-10 pt-[2.5rem] px-8 pb-8 max-[900px]:pt-6 max-[900px]:px-2 max-[900px]:pb-4 max-[900px]:mt-0 max-[900px]:mx-[-8px] max-[900px]:mb-6 fr-card fr-card--no-arrow"
  >
    <div class="fr-card__body">
      <div class="fr-card__content">
        <div class="flex flex-col gap-4 fr-mb-2w">
          <div
            class="bg-[var(--background-alt-grey)] rounded-[8px] fr-p-2w border border-[color:var(--border-default-grey)] fr-mb-3v [&_strong]:font-bold [&_strong]:text-[color:var(--text-default-info)] [&_span]:text-[0.95rem] [&_span]:text-[color:var(--text-mention-grey)] [&_span]:mt-2"
          >
            <strong>Qu'est-ce qu'une prescription&nbsp;?</strong><br />
            <span
              >Une prescription est une exigence, mesure ou condition imposée par l’autorité
              administrative (ou parfois recommandée par l’instructeur du dossier) pour encadrer la
              réalisation d’un projet susceptible d’impacter des espèces protégées. Une prescription
              est soumise à des <strong>contrôles</strong>.</span
            >
          </div>
          <div
            class="bg-[var(--background-alt-grey)] rounded-[8px] fr-p-2w border border-[color:var(--border-default-grey)] fr-mb-3v [&_strong]:font-bold [&_strong]:text-[color:var(--text-default-info)] [&_span]:text-[0.95rem] [&_span]:text-[color:var(--text-mention-grey)] [&_span]:mt-2"
          >
            <strong>Qu'est-ce qu'un contrôle&nbsp;?</strong><br />
            <span
              >Un contrôle est vérification ou évaluation d’une <strong>prescription</strong>. Il
              permet de s’assurer que les conditions légales et réglementaires encadrant la
              protection des espèces protégées sont bien respectées. Un contrôle a deux états :
              <strong>conforme / non conforme</strong>.</span
            >
          </div>
        </div>
        <div class="w-full fr-mt-4w fr-mx-0 fr-mb-2w">
          <div class="flex justify-between items-center fr-mb-1w">
            <div class="flex flex-col items-center text-[1rem]">
              <span class="text-[2rem] fr-text--bold block text-[color:var(--text-default-info)]"
                >{stats.prescriptionWithControleCount}</span
              >
              <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
                >Contrôlées dans Pitchou<br />{controlledPercentage}%</span
              >
            </div>
            <div class="flex flex-col items-center text-[1rem]">
              <span class="text-[2rem] fr-text--bold block text-[color:var(--text-mention-grey)]"
                >{stats.controllablePrescriptionCount - stats.prescriptionWithControleCount}</span
              >
              <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
                >Non contrôlées dans Pitchou<br />{100 - controlledPercentage}%</span
              >
            </div>
          </div>
          <div
            class="fr-progress-bar fr-mt-2w"
            style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden;"
          >
            <div
              style="width: {controlledPercentage}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
            ></div>
            <div
              style="width: {100 -
                controlledPercentage}%; background: var(--background-contrast-grey); height: 100%; display: inline-block;"
            ></div>
          </div>
          <div class="text-center fr-mt-1w">
            <span class="text-[0.875rem] text-[color:var(--text-mention-grey)] fr-mt-1v"
              >Total prescriptions contrôlables dans Pitchou : <strong
                >{stats.controllablePrescriptionCount}</strong
              ></span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
