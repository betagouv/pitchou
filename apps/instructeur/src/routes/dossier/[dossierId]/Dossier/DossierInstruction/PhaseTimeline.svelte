<script lang="ts">
  import { timelineSteps } from "./timeline.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    events: DossierFull["evenementsPhase"];
    depotDate: DossierFull["depot_date"];
  };

  let { events, depotDate }: Props = $props();

  const steps = $derived(timelineSteps(events, depotDate));

  // Same green as the list's progress bar.
  const DONE_COLOR = "bg-[#61CE8C]";
</script>

<ol class="fr-m-0 fr-p-0 grid list-none grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
  {#each steps as step, index}
    <li class="relative flex flex-col items-center gap-1 px-2 text-center">
      {#if index > 0}
        <!-- Connector to the previous step, green up to the current phase. -->
        <span
          class="absolute right-1/2 top-[0.625rem] z-0 h-[0.25rem] w-full {step.state === 'future'
            ? 'bg-[var(--background-contrast-grey)]'
            : DONE_COLOR}"
          aria-hidden="true"
        ></span>
      {/if}

      {#if step.state === "done"}
        <span
          class="relative z-10 flex size-6 items-center justify-center rounded-full {DONE_COLOR} text-white"
          aria-hidden="true"
        >
          <span class="fr-icon-check-line fr-icon--sm" aria-hidden="true"></span>
        </span>
      {:else if step.state === "current"}
        <span class="relative z-10 size-6 rounded-full bg-[#F4732E]" aria-hidden="true"></span>
      {:else}
        <span
          class="relative z-10 size-6 rounded-full bg-[var(--background-contrast-grey)]"
          aria-hidden="true"
        ></span>
      {/if}

      <span class="fr-text--sm fr-mb-0 font-bold text-[color:var(--text-title-grey)]">
        {step.label}
      </span>

      {#if step.state === "current"}
        <p class="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--orange-terre-battue fr-mb-0">
          En cours
        </p>
      {/if}

      {#each step.detail as line}
        <span class="fr-text--xs fr-mb-0 text-[color:var(--text-mention-grey)]">{line}</span>
      {/each}

      <span class="fr-sr-only">
        {step.state === "done"
          ? "(terminée)"
          : step.state === "current"
            ? "(en cours)"
            : "(à venir)"}
      </span>
    </li>
  {/each}
</ol>
