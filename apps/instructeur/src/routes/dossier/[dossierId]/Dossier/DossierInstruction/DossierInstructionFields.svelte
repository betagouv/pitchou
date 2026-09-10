<script lang="ts">
  import { phases } from "@pitchou/common/phases.ts";
  import megaphoneIcon from "@gouvfr/dsfr/dist/icons/business/megaphone-fill.svg?no-inline";
  import { nextActionOptions } from "./nextAction.ts";
  import DateInput from "$lib/components/DateInput.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    enjeu: boolean | null;
    ddepValue: string;
    ddep?: boolean | null;
    erSufficient?: boolean | null;
    phase: string;
    nextAction?: DossierFull["next_action_expected_from"];
    nextDueDate?: Date | null;
    onagre?: string | null;
    consultationStart?: Date | null;
    consultationEnd?: Date | null;
    dismiss: () => void;
    disabled?: boolean;
  };
  let {
    enjeu = $bindable(),
    ddepValue = $bindable(),
    ddep = $bindable(),
    erSufficient = $bindable(),
    phase = $bindable(),
    nextAction = $bindable(),
    nextDueDate = $bindable(),
    onagre = $bindable(),
    consultationStart = $bindable(),
    consultationEnd = $bindable(),
    dismiss,
    disabled = false,
  }: Props = $props();

  const phaseOptions = $derived([...phases].map((phase) => ({ value: phase, label: phase })));

  const ddepOptions = [
    { value: "oui", label: "Oui" },
    { value: "non_er_mesures_sufficient", label: "Non, mesures Éviter, Réduire (ER) suffisantes" },
    { value: "non_sans_objet", label: "Non, sans objet" },
    { value: "a_determiner", label: "À déterminer" },
  ];

  function setDdep(value: string) {
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

  const enjeuOptions = [
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ];

  function setEnjeu(value: string) {
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
    <Select id="phase" options={phaseOptions} bind:value={phase} {disabled} />
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="next_action_expected_from">
      <span class="fr-icon-todo-line {iconClass}" aria-hidden="true"></span>
      Entité en charge de la prochaine action
    </label>
    <Select
      id="next_action_expected_from"
      options={nextActionOptions}
      value={nextAction ?? ""}
      onChange={(value) => (nextAction = value || null)}
      {disabled}
    />
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="next_due_date">
      <span class="fr-icon-calendar-line {iconClass}" aria-hidden="true"></span>
      Prochaine échéance
    </label>
    <DateInput id="next_due_date" label="Prochaine échéance" bind:date={nextDueDate} {disabled} />
  </div>

  <div class={rowClass}>
    <p class={labelClass} id="consultation-du-public-label">
      <span
        class="fr-icon-megaphone-fill {iconClass}"
        style:--megaphone-icon={`url('${megaphoneIcon}')`}
        aria-hidden="true"
      ></span>
      Consultation du public
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <DateInput
        id="public_consultation_start_date"
        label="Date de début de la consultation du public"
        bind:date={consultationStart}
        {disabled}
      />
      <span class="text-[color:var(--text-mention-grey)]" aria-hidden="true">→</span>
      <DateInput
        id="public_consultation_end_date"
        label="Date de fin de la consultation du public"
        bind:date={consultationEnd}
        {disabled}
      />
    </div>
  </div>

  <h4 class="fr-mt-4w fr-mb-0">Informations liées au dossier</h4>

  <div class={rowClass}>
    <label class={labelClass} for="ddep-necessaire">
      <span class="fr-icon-leaf-line {iconClass}" aria-hidden="true"></span>
      Nécessité d’une DDEP
    </label>
    <Select
      id="ddep-necessaire"
      options={ddepOptions}
      bind:value={ddepValue}
      onChange={setDdep}
      {disabled}
    />
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="enjeu">
      <span class="fr-icon-alarm-warning-line {iconClass}" aria-hidden="true"></span>
      Dossier à enjeu
    </label>
    <Select id="enjeu" options={enjeuOptions} value={enjeuValue} onChange={setEnjeu} {disabled} />
  </div>

  <div class={rowClass}>
    <label class={labelClass} for="onagre_demande_identifier">
      <span class="fr-icon-hashtag {iconClass}" aria-hidden="true"></span>
      N° de dossier Onagre
    </label>
    <input
      class="fr-input fr-m-0"
      id="onagre_demande_identifier"
      type="text"
      bind:value={onagre}
      {disabled}
    />
  </div>
</section>

<style>
  /* The bundled DSFR has this icon; the older global stylesheet does not. */
  .fr-icon-megaphone-fill::before {
    -webkit-mask-image: var(--megaphone-icon);
    mask-image: var(--megaphone-icon);
  }
</style>
