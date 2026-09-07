<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { especeLabel } from "@pitchou/common/especesUtils.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./listModel.ts";
  type Props = { draft: DossiersQuery; onOpenEspecesDrawer: () => void };
  let { draft = $bindable(), onOpenEspecesDrawer }: Props = $props();
  const newModifications = $derived(draft.nouveaute === "oui");

  const especesSummary = $derived.by(() => {
    const [first, ...others] = draft.espece;
    if (!first) return "Recherchez une ou plusieurs espèces protégées…";
    if (others.length) return `${draft.espece.length} espèces sélectionnées`;
    const espece = store.espèceByCD_REF?.get(first);
    return espece ? especeLabel(espece) : first;
  });
</script>

<fieldset class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <legend
    class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w [&_span[class*=fr-icon]]:text-[color:var(--text-action-high-blue-france,#000091)]"
    ><span class="fr-icon-calendar-line fr-icon--sm" aria-hidden="true"></span> Date</legend
  >
  {#each [["deposit", "de dépôt"], ["phaseStart", "de début de phase"], ["lastModified", "de dernière modification"]] as option}
    <div class="fr-radio-group fr-radio-group--sm">
      <input
        type="radio"
        id="date-{option[0]}"
        value={option[0]}
        bind:group={draft.dateField}
      /><label class="fr-label" for="date-{option[0]}">{option[1]}</label>
    </div>
  {/each}
  <div class="flex items-center gap-2 fr-mt-1w">
    <span>Du</span><DatePicker
      id="date-du"
      label="Du"
      value={draft.dateStart}
      max={draft.dateEnd || undefined}
      onChange={(value) => (draft.dateStart = value ?? "")}
    />
    <span>au</span><DatePicker
      id="date-au"
      label="au"
      value={draft.dateEnd}
      min={draft.dateStart || undefined}
      align="right"
      onChange={(value) => (draft.dateEnd = value ?? "")}
    />
  </div>
</fieldset>

<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3 class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w">
    <span class="fr-icon-notification-3-line fr-icon--sm" aria-hidden="true"></span>Nouveaux
    événements
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input
      type="checkbox"
      id="nouvelles-modifications"
      checked={newModifications}
      onchange={(e) => (draft.nouveaute = e.currentTarget.checked ? "oui" : "")}
    /><label class="fr-label" for="nouvelles-modifications"
      >Dossiers avec nouvelles modifications</label
    >
  </div>
</div>
<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3 class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w">
    <span class="fr-icon-alarm-warning-line fr-icon--sm" aria-hidden="true"></span>Dossiers à enjeu
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input type="checkbox" id="enjeu-uniquement" bind:checked={draft.enjeu} /><label
      class="fr-label"
      for="enjeu-uniquement">Dossiers à enjeux uniquement</label
    >
  </div>
</div>
<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3 class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w">
    <span class="fr-icon-leaf-line fr-icon--sm" aria-hidden="true"></span> Espèce impactée
  </h3>
  <button
    type="button"
    class="fr-select w-full text-left truncate cursor-pointer [&.placeholder]:text-[color:var(--text-mention-grey)]"
    class:placeholder={draft.espece.length === 0}
    id="filtre-espece"
    onclick={onOpenEspecesDrawer}
  >
    {especesSummary}
  </button>
  <div class="fr-checkbox-group fr-checkbox-group--sm fr-mt-1w">
    <input
      type="checkbox"
      id="especes-absente"
      bind:checked={draft.especesImpacteesAbsente}
    /><label class="fr-label" for="especes-absente"
      >Liste des espèces impactées non-renseignée</label
    >
  </div>
</div>
<div class="border-0 fr-mt-0 fr-mx-0 fr-mb-3w fr-p-0">
  <h3 class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w">
    <span class="fr-icon-file-text-line fr-icon--sm" aria-hidden="true"></span>Pièces jointes
  </h3>
  <div class="fr-checkbox-group fr-checkbox-group--sm">
    <input type="checkbox" id="avis-manquant" bind:checked={draft.avisExpertManquant} /><label
      class="fr-label"
      for="avis-manquant">Avis CNPN/CSRPN non renseigné</label
    >
  </div>
  <div class="fr-input-group fr-mt-1w fr-mb-0">
    <label class="fr-sr-only fr-label" for="decision-numero">Numéro d'arrêté préfectoral</label
    ><input
      class="fr-input"
      id="decision-numero"
      type="text"
      placeholder="Saisissez votre numéro d'arrêté préfectoral, de courrier…"
      bind:value={draft.decisionText}
    />
  </div>
  <div class="fr-checkbox-group fr-checkbox-group--sm fr-mt-1w">
    <input type="checkbox" id="decision-absente" bind:checked={draft.decisionAbsente} /><label
      class="fr-label"
      for="decision-absente">Décision administrative non renseignée</label
    >
  </div>
</div>
