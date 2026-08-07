<script lang="ts">
  import {
    scientifiqueCaptureModeOptions,
    scientifiqueDemandeTypeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";
  import type { DossierCreationModel } from "../dossierCreationModel.ts";
  let { model }: { model: DossierCreationModel } = $props();
  const otherCaptureMode = "Autre moyen de capture (préciser)";
  function toggle(value: string, checked: boolean) {
    model.scientifiqueCaptureModes = checked
      ? [...model.scientifiqueCaptureModes, value]
      : model.scientifiqueCaptureModes.filter((item) => item !== value);
  }
</script>

<fieldset class="fr-fieldset fr-mt-5w fr-mb-4w">
  <legend class="fr-fieldset__legend font-normal"
    >En cas de nécessité de capture d'individus, précisez le mode de capture<span
      class="fr-hint-text">Vous pouvez sélectionner un ou plusieurs choix.</span
    ></legend
  >
  {#each [...scientifiqueCaptureModeOptions, otherCaptureMode] as option, index}
    <div class="fr-fieldset__element">
      <div class="fr-checkbox-group">
        <input
          id={`scientific-capture-mode-${index}`}
          type="checkbox"
          checked={model.scientifiqueCaptureModes.includes(option)}
          onchange={(event) => toggle(option, event.currentTarget.checked)}
        />
        <label class="fr-label" for={`scientific-capture-mode-${index}`}>{option}</label>
      </div>
    </div>
  {/each}
</fieldset>
{#if model.scientifiqueCaptureModes.includes(otherCaptureMode)}
  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="scientific-other-capture-mode"
      >Préciser le(s) autre(s) moyen(s) de capture</label
    >
    <textarea
      class="fr-input"
      id="scientific-other-capture-mode"
      rows="4"
      bind:value={model.scientifiqueOtherCaptureMode}></textarea>
  </div>
{/if}
<fieldset class="fr-fieldset fr-mb-4w">
  <legend class="fr-fieldset__legend font-normal">Utilisez-vous des sources lumineuses ?</legend>
  {#each [["oui", "Oui"], ["non", "Non"]] as [value, label]}
    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-radio-group">
        <input
          id={`scientific-light-sources-${value}`}
          type="radio"
          name="scientific-light-sources"
          {value}
          bind:group={model.scientifiqueUsesLightSources}
        />
        <label class="fr-label" for={`scientific-light-sources-${value}`}>{label}</label>
      </div>
    </div>
  {/each}
</fieldset>
{#if model.scientifiqueUsesLightSources === "oui"}
  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="scientific-light-source-conditions"
      >Précisez les modalités de l'utilisation des sources lumineuses</label
    ><textarea
      class="fr-input"
      id="scientific-light-source-conditions"
      rows="4"
      bind:value={model.scientifiqueLightSourceConditions}></textarea>
  </div>
{/if}
{#if model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[1])}
  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="scientific-marking-conditions"
      >Précisez les modalités de marquage pour chaque taxon</label
    ><textarea
      class="fr-input"
      id="scientific-marking-conditions"
      rows="4"
      bind:value={model.scientifiqueMarkingConditions}></textarea>
  </div>
{/if}
{#if model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[2])}
  <div class="fr-input-group w-full">
    <label class="fr-label" for="scientific-transport-conditions"
      >Précisez les modalités de transport et la destination concernant la collecte de matériel
      biologique</label
    ><textarea
      class="fr-input"
      id="scientific-transport-conditions"
      rows="4"
      bind:value={model.scientifiqueTransportConditions}></textarea>
  </div>
{/if}
