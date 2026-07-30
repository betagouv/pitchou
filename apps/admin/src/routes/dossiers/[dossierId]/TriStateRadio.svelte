<script lang="ts">
  import type { TriState } from "./dossierAdminFormModel.ts";

  type Props = {
    id: string;
    label: string;
    value: TriState;
    onChange: (value: TriState) => void;
    emptyLabel?: string;
    hint?: string;
  };

  let { id, label, value, onChange, emptyLabel = "Non renseigné", hint }: Props = $props();
</script>

<fieldset class="fr-fieldset fr-mb-0" aria-labelledby={`${id}-legend`}>
  <legend class="fr-fieldset__legend fr-text--regular" id={`${id}-legend`}>
    {label}
    {#if hint}<span class="fr-hint-text">{hint}</span>{/if}
  </legend>
  <div class="fr-fieldset__element fr-fieldset__element--inline">
    <div class="fr-radio-group">
      <input
        id={`${id}-yes`}
        type="radio"
        name={id}
        value="oui"
        checked={value === "oui"}
        onchange={() => onChange("oui")}
      />
      <label class="fr-label" for={`${id}-yes`}>Oui</label>
    </div>
  </div>
  <div class="fr-fieldset__element fr-fieldset__element--inline">
    <div class="fr-radio-group">
      <input
        id={`${id}-no`}
        type="radio"
        name={id}
        value="non"
        checked={value === "non"}
        onchange={() => onChange("non")}
      />
      <label class="fr-label" for={`${id}-no`}>Non</label>
    </div>
  </div>
  <div class="fr-fieldset__element fr-fieldset__element--inline">
    <div class="fr-radio-group">
      <input
        id={`${id}-empty`}
        type="radio"
        name={id}
        value=""
        checked={value === ""}
        onchange={() => onChange("")}
      />
      <label class="fr-label" for={`${id}-empty`}>{emptyLabel}</label>
    </div>
  </div>
</fieldset>
