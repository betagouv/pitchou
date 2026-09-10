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
    <li class="relative flex min-w-0 flex-col gap-1">
      {#if index > 0}
        <!-- Connector to the previous step, green up to the current phase. -->
        <span
          class="connector absolute top-[0.625rem] z-0 h-[0.25rem] {step.state === 'future'
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
        <span
          class="relative z-10 size-6 rounded-full bg-[#F4732E] ring-4 ring-white"
          aria-hidden="true"
        ></span>
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

<style>
  li {
    align-items: var(--step-alignment, center);
    text-align: var(--step-text-alignment, center);
    overflow-wrap: anywhere;
  }

  .connector {
    display: var(--connector-display, block);
    left: var(--connector-left, -50%);
    right: var(--connector-right, 50%);
  }

  /* Each wrapped row has its own connectors, with markers at both content edges. */
  @media (width < 40rem) {
    li:nth-child(2n + 1) {
      --step-alignment: flex-start;
      --step-text-alignment: left;
      --connector-display: none;
    }
    li:nth-child(2n) {
      --step-alignment: flex-end;
      --step-text-alignment: right;
      --connector-left: calc(-100% + 12px);
      --connector-right: 12px;
    }
  }

  @media (40rem <= width < 64rem) {
    li:nth-child(3n + 1) {
      --step-alignment: flex-start;
      --step-text-alignment: left;
      --connector-display: none;
    }
    li:nth-child(3n + 2) {
      --connector-left: calc(-100% + 12px);
    }
    li:nth-child(3n) {
      --step-alignment: flex-end;
      --step-text-alignment: right;
      --connector-right: 12px;
    }
  }

  @media (width >= 64rem) {
    li:first-child {
      --step-alignment: flex-start;
      --step-text-alignment: left;
    }
    li:nth-child(2) {
      --connector-left: calc(-100% + 12px);
    }
    li:last-child {
      --step-alignment: flex-end;
      --step-text-alignment: right;
      --connector-right: 12px;
    }
  }
</style>
