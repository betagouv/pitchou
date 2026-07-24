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
  <div
    class="fr-card fr-card--no-arrow border-[1.5px] border-[color:var(--border-default-grey)] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] fr-background-default--grey max-w-[100vw] mt-0 mb-10 -mx-4 pt-10 px-8 pb-8 max-[900px]:mb-6 max-[900px]:-mx-2 max-[900px]:pt-6 max-[900px]:px-2 max-[900px]:pb-4"
  >
    <div class="fr-card__body">
      <div class="fr-card__content">
        <div class="text-center flex justify-around w-full fr-mb-4w">
          <div
            class="flex flex-col items-center justify-center py-4 px-2 rounded-[8px] fr-mx-1w fr-my-0 min-w-[120px] max-[900px]:min-w-[90px] max-[900px]:py-3 max-[900px]:px-1"
          >
            <span
              class="text-[2.2rem] fr-text--bold fr-mb-1v tracking-[0.01em] text-[color:var(--success-425-625)]"
              >{initialConformiteCount}</span
            >
            <span class="text-[1rem] fr-text-mention--grey mt-[0.15rem] font-medium"
              >Conformité initiale</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center py-4 px-2 rounded-[8px] fr-mx-1w fr-my-0 min-w-[120px] max-[900px]:min-w-[90px] max-[900px]:py-3 max-[900px]:px-1"
          >
            <span
              class="text-[2.2rem] fr-text--bold fr-mb-1v tracking-[0.01em] text-[color:var(--green-emeraude-950-100-active)]"
              >{returnedToConformiteCount}</span
            >
            <span class="text-[1rem] fr-text-mention--grey mt-[0.15rem] font-medium"
              >Retour à la conformité</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center py-4 px-2 rounded-[8px] fr-mx-1w fr-my-0 min-w-[120px] max-[900px]:min-w-[90px] max-[900px]:py-3 max-[900px]:px-1"
          >
            <span
              class="text-[2.2rem] fr-text--bold fr-mb-1v tracking-[0.01em] text-[color:var(--red-marianne-main-472)]"
              >{nonConformeCount}</span
            >
            <span class="text-[1rem] fr-text-mention--grey mt-[0.15rem] font-medium"
              >Non conforme</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center py-4 px-2 rounded-[8px] fr-mx-1w fr-my-0 min-w-[120px] max-[900px]:min-w-[90px] max-[900px]:py-3 max-[900px]:px-1"
          >
            <span
              class="text-[2.2rem] fr-text--bold fr-mb-1v tracking-[0.01em] text-[color:var(--grey-50-1000)]"
              >{tooLateCount}</span
            >
            <span class="text-[1rem] fr-text-mention--grey mt-[0.15rem] font-medium">Trop tard</span
            >
          </div>
          <div
            class="flex flex-col items-center justify-center py-4 px-2 rounded-[8px] fr-mx-1w fr-my-0 min-w-[120px] max-[900px]:min-w-[90px] max-[900px]:py-3 max-[900px]:px-1"
          >
            <span
              class="text-[2.2rem] fr-text--bold fr-mb-1v tracking-[0.01em] text-[color:var(--text-disabled-grey)]"
              >{otherCount}</span
            >
            <span class="text-[1rem] fr-text-mention--grey mt-[0.15rem] font-medium">Autre</span>
          </div>
        </div>

        <div
          class="fr-progress-bar fr-mt-2w flex mb-8 mx-0 shadow-none bg-[var(--text-disabled-grey)] rounded-[8px] h-6"
        >
          <div
            class="h-full transition-[width] duration-500 bg-[var(--success-425-625)]"
            style:width="{initialConformitePercentage}%"
          ></div>
          <div
            class="h-full transition-[width] duration-500 bg-[var(--green-emeraude-950-100-active)]"
            style:width="{returnedToConformitePercentage}%"
          ></div>
          <div
            class="h-full transition-[width] duration-500 bg-[var(--red-marianne-main-472)]"
            style:width="{nonConformePercentage}%"
          ></div>
          <div
            class="h-full transition-[width] duration-500 bg-[var(--grey-50-1000)]"
            style:width="{tooLatePercentage}%"
          ></div>
        </div>

        <div class="text-[small]">
          <div>
            <span
              class="w-[18px] h-[18px] rounded-full inline-block fr-mr-1w border-2 border-[color:var(--border-default-grey)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-[var(--success-425-625)]"
            ></span>
            <span
              ><strong>Conformité initiale</strong> : Prescription validée dès le 1<sup>er</sup> contrôle.</span
            >
          </div>
          <div>
            <span
              class="w-[18px] h-[18px] rounded-full inline-block fr-mr-1w border-2 border-[color:var(--border-default-grey)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-[var(--green-emeraude-950-100-active)]"
            ></span>
            <span
              ><strong>Retour à la conformité</strong> : Prescription validée après au moins 2 contrôles.</span
            >
          </div>
          <div>
            <span
              class="w-[18px] h-[18px] rounded-full inline-block fr-mr-1w border-2 border-[color:var(--border-default-grey)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-[var(--red-marianne-main-472)]"
            ></span>
            <span
              ><strong>Non conforme</strong> : Prescription dont le dernier contrôle est "Non conforme".</span
            >
          </div>
          <div>
            <span
              class="w-[18px] h-[18px] rounded-full inline-block fr-mr-1w border-2 border-[color:var(--border-default-grey)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-[var(--grey-50-1000)]"
            ></span>
            <span
              ><strong>Trop tard</strong> : Prescription pour laquelle il n'est plus possible de retour
              à la conformité.</span
            >
          </div>
          <div>
            <span
              class="w-[18px] h-[18px] rounded-full inline-block fr-mr-1w border-2 border-[color:var(--border-default-grey)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-[var(--text-disabled-grey)]"
            ></span>
            <span
              ><strong>Autre</strong> : Pas encore finalisé/manque d'information/non renseigné.</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
