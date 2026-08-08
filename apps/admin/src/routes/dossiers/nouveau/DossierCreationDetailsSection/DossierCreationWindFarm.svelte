<script lang="ts">
  import type { DossierCreationModel } from "../dossierCreationModel.ts";
  let { model }: { model: DossierCreationModel } = $props();
  let input = $state<HTMLInputElement>();
  let error = $state("");
  function setFiles(files: File[]) {
    if (files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      error = "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
      return;
    }
    error = "";
    model.windFarmPlanFiles = files;
  }
  function setNumber(
    field:
      | "eolienCommissioningYear"
      | "eolienTurbinesCount"
      | "eolienTipHeight"
      | "eolienRotorDiameter"
      | "eolienGroundClearance",
    value: number,
  ) {
    model[field] = Number.isNaN(value) ? null : value;
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
  aria-labelledby="wind-farm-title"
>
  <h3 class="fr-h3" id="wind-farm-title">8.1. Description du parc éolien concerné</h3>
  {#each [["eolien-commissioning-year", "Année de mise en service", "1", "1", "eolienCommissioningYear"], ["eolien-turbines-count", "Nombre d'éoliennes", "1", "1", "eolienTurbinesCount"], ["eolien-tip-height", "Hauteur totale bout de pale (m)", "0.001", "0.001", "eolienTipHeight"], ["eolien-rotor-diameter", "Diamètre du rotor (m)", "0.001", "0.001", "eolienRotorDiameter"], ["eolien-ground-clearance", "Garde au sol (m)", "0.001", "0.001", "eolienGroundClearance"]] as [id, label, min, step, field]}
    <div class="fr-input-group max-w-xl fr-mb-4w">
      <label class="fr-label" for={id}
        >{label}{#if step === "0.001"}<span class="fr-hint-text"
            >Format attendu : De 1 à 3 décimales après le point. Exemple: 3.141</span
          >{/if}<span class="fr-hint-text">Ce nombre doit être positif.</span></label
      >
      <input
        class="fr-input"
        {id}
        type="number"
        {min}
        {step}
        value={model[field as keyof DossierCreationModel] as number | null}
        oninput={(event) =>
          setNumber(field as "eolienCommissioningYear", event.currentTarget.valueAsNumber)}
      />
    </div>
  {/each}
  <div class="fr-upload-group">
    <label class="fr-label" for="wind-farm-plan-files"
      >Plan des installations<span class="fr-hint-text"
        >Taille totale maximale : 65 Mo. Plusieurs fichiers possibles</span
      ></label
    >
    <div
      class="border-2 border-dashed border-[color:var(--border-default-grey)] fr-p-4w text-center"
      role="group"
      aria-label="Déposer le plan des installations"
      ondragover={(event) => event.preventDefault()}
      ondrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer) setFiles([...event.dataTransfer.files]);
      }}
    >
      <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
      <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
      <span class="fr-mx-2w">OU</span>
      <button class="fr-btn fr-btn--secondary" type="button" onclick={() => input?.click()}
        >Choisir des fichiers</button
      >
      <input
        class="fr-sr-only"
        id="wind-farm-plan-files"
        type="file"
        multiple
        bind:this={input}
        onchange={(event) => setFiles([...(event.currentTarget.files ?? [])])}
      />
    </div>
    {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
    {#if model.windFarmPlanFiles.length >= 1}<ul class="fr-mt-2w">
        {#each model.windFarmPlanFiles as file (file.name)}<li>{file.name}</li>{/each}
      </ul>{/if}
  </div>
</section>
