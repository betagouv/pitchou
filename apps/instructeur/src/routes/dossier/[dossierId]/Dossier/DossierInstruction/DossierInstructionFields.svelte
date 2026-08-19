<script lang="ts">
  import {
    phases,
    prochaineActionAttenduePar,
    prochainesActionsAttenduesParEntite,
  } from "$lib/dossier/displayDossier.ts";
  import DateInput from "$lib/components/DateInput.svelte";
  import type { DossierFull, DossierNextActionExpectedFrom } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    enjeu: boolean | null;
    ddepValue: string;
    ddep?: boolean | null;
    erSufficient?: boolean | null;
    phase: string;
    nextAction?: DossierFull["next_action_expected_from"];
    nextActionExpected?: DossierFull["next_action_expected"];
    nextDueDate?: Date | null;
    onagre?: string | null;
    consultationStart?: Date | null;
    consultationEnd?: Date | null;
    dismiss: () => void;
  };
  let {
    enjeu = $bindable(),
    ddepValue = $bindable(),
    ddep = $bindable(),
    erSufficient = $bindable(),
    phase = $bindable(),
    nextAction = $bindable(),
    nextActionExpected = $bindable(),
    nextDueDate = $bindable(),
    onagre = $bindable(),
    consultationStart = $bindable(),
    consultationEnd = $bindable(),
    dismiss,
  }: Props = $props();

  const availableNextActions = $derived(
    nextAction
      ? (prochainesActionsAttenduesParEntite.get(nextAction as DossierNextActionExpectedFrom) ?? [])
      : [],
  );

  function resetIncompatibleNextAction() {
    if (nextActionExpected && !(availableNextActions as string[]).includes(nextActionExpected)) {
      nextActionExpected = null;
    }
  }

  function setDdep(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "oui") {
      ddep = true;
      erSufficient = false;
    } else if (value === "non_sans_objet") {
      ddep = false;
      erSufficient = false;
    } else if (value === "non_er_mesures_sufficient") {
      ddep = false;
      erSufficient = true;
    } else {
      ddep = null;
      erSufficient = null;
    }
  }

  const enjeuValue = $derived(enjeu === true ? "oui" : enjeu === false ? "non" : "a_determiner");

  function setEnjeu(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    enjeu = value === "oui" ? true : value === "non" ? false : null;
  }

  const rowClass = "grid items-center gap-2 md:grid-cols-[minmax(14rem,22rem)_minmax(16rem,26rem)]";
  const labelClass = "fr-m-0 flex items-center gap-2 font-medium";
  const iconClass = "fr-icon--sm flex-none text-[color:var(--text-mention-grey)]";
</script>

<section class="flex flex-col gap-4" onfocusin={dismiss}>
  <div class={rowClass}>
    <label class={labelClass} for="phase">
      <span class="fr-icon-time-line {iconClass}" aria-hidden="true"></span>
      Phase en cours
    </label>
    <select bind:value={phase} class="fr-select fr-m-0" id="phase">
      {#each phases as value}<option {value}>{value}</option>{/each}
    </select>
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="next_action_expected_from">
      <span class="fr-icon-bank-line {iconClass}" aria-hidden="true"></span>
      Entité en charge de la prochaine action
    </label>
    <select
      bind:value={nextAction}
      onchange={resetIncompatibleNextAction}
      class="fr-select fr-m-0"
      id="next_action_expected_from"
    >
      {#each prochaineActionAttenduePar as actor}<option value={actor}>{actor}</option>{/each}
    </select>
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="next_action_expected">
      <span class="fr-icon-todo-line {iconClass}" aria-hidden="true"></span>
      Prochaine action attendue
    </label>
    <select
      bind:value={nextActionExpected}
      class="fr-select fr-m-0"
      id="next_action_expected"
      disabled={availableNextActions.length === 0}
    >
      <option value={null}>—</option>
      {#each availableNextActions as value}<option {value}>{value}</option>{/each}
    </select>
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="next_due_date">
      <span class="fr-icon-calendar-line {iconClass}" aria-hidden="true"></span>
      Prochaine échéance
    </label>
    <DateInput id="next_due_date" label="Prochaine échéance" bind:date={nextDueDate} />
  </div>

  <div class={rowClass}>
    <p class={labelClass} id="consultation-du-public-label">
      <span class="fr-icon-volume-up-line {iconClass}" aria-hidden="true"></span>
      Consultation du public
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <DateInput
        id="public_consultation_start_date"
        label="Date de début de la consultation du public"
        bind:date={consultationStart}
      />
      <span class="text-[color:var(--text-mention-grey)]" aria-hidden="true">→</span>
      <DateInput
        id="public_consultation_end_date"
        label="Date de fin de la consultation du public"
        bind:date={consultationEnd}
      />
    </div>
  </div>

  <h2 class="fr-mt-4w fr-mb-0 fr-text--lg">Informations liées au dossier</h2>

  <div class={rowClass}>
    <label class={labelClass} for="ddep-necessaire">
      <span class="fr-icon-leaf-line {iconClass}" aria-hidden="true"></span>
      Nécessité d’une DDEP
    </label>
    <select bind:value={ddepValue} onchange={setDdep} class="fr-select fr-m-0" id="ddep-necessaire">
      <option value="oui">Oui</option>
      <option value="non_er_mesures_sufficient"
        >Non, mesures Éviter, Réduire (ER) suffisantes</option
      >
      <option value="non_sans_objet">Non, sans objet</option>
      <option value="a_determiner">À déterminer</option>
    </select>
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="enjeu">
      <span class="fr-icon-alarm-warning-line {iconClass}" aria-hidden="true"></span>
      Dossier à enjeu
    </label>
    <select value={enjeuValue} onchange={setEnjeu} class="fr-select fr-m-0" id="enjeu">
      <option value="oui">Oui</option>
      <option value="non">Non</option>
      <option value="a_determiner">À déterminer</option>
    </select>
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="onagre_demande_identifier">
      <span class="fr-icon-hashtag {iconClass}" aria-hidden="true"></span>
      N° de dossier Onagre
    </label>
    <input class="fr-input fr-m-0" id="onagre_demande_identifier" type="text" bind:value={onagre} />
  </div>
</section>
