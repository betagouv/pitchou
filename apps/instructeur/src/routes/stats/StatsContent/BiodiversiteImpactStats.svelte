<script lang="ts">
  import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";
  type Props = { stats: PublicStats["biodiversiteImpactStats"] };
  let { stats }: Props = $props();
  const metrics = $derived([
    { value: stats.conformePrescriptionCount, label: "Prescriptions conformes", visible: true },
    {
      value: `${stats.avoidedSurfaceTotal.toLocaleString()} m²`,
      label: "Surface évitée",
      visible: true,
    },
    {
      value: `${stats.compensatedSurfaceTotal.toLocaleString()} m²`,
      label: "Surface compensée",
      visible: true,
    },
    { value: stats.avoidedNidsCount, label: "Nids évités", visible: stats.avoidedNidsCount > 0 },
    {
      value: stats.compensatedNidsCount,
      label: "Nids compensés",
      visible: stats.compensatedNidsCount > 0,
    },
    {
      value: stats.avoidedIndividusCount,
      label: "Individus évités",
      visible: stats.avoidedIndividusCount > 0,
    },
    {
      value: stats.compensatedIndividusCount,
      label: "Individus compensés",
      visible: stats.compensatedIndividusCount > 0,
    },
  ]);
</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Impact biodiversité des prescriptions conformes</h2>
  <div
    class="border-[1.5px] border-[color:var(--border-default-grey)] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[var(--background-default-grey)] max-w-[100vw] mt-0 mx-[-16px] mb-10 pt-[2.5rem] px-8 pb-8 max-[900px]:pt-6 max-[900px]:px-2 max-[900px]:pb-4 max-[900px]:mt-0 max-[900px]:mx-[-8px] max-[900px]:mb-6 fr-card fr-card--no-arrow"
  >
    <div class="fr-card__body">
      <div class="fr-card__content">
        <div class="flex flex-wrap justify-around gap-x-6 gap-y-8 fr-mb-3w">
          {#each metrics as metric}
            {#if metric.visible}
              <div class="flex flex-col items-center min-w-[120px] fr-mb-1w">
                <span
                  class="text-[2rem] fr-text--bold block text-[color:var(--text-default-info)] fr-mb-1v"
                  >{metric.value}</span
                >
                <span
                  class="text-[1rem] text-[color:var(--text-mention-grey)] mt-[0.15rem] font-medium text-center"
                  >{metric.label}</span
                >
              </div>
            {/if}
          {/each}
        </div>
        <div class="text-center text-[color:var(--text-mention-grey)] fr-mt-2w fr-text--xs">
          <em
            >Ces chiffres agrègent les prescriptions dont le dernier contrôle est "Conforme" et pour
            lesquelles des valeurs quantitatives ont été renseignées.</em
          >
        </div>
      </div>
    </div>
  </div>
</section>
