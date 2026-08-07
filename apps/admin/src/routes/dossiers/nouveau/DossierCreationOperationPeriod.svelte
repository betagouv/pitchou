<script lang="ts">
  import { showsDerogationDuration, type DossierCreationModel } from "./dossierCreationModel.ts";
  let { model }: { model: DossierCreationModel } = $props();
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
  aria-labelledby="operation-period-title"
>
  <h3 class="fr-h3" id="operation-period-title">8.2. Période de l'opération</h3>
  <div class="fr-input-group max-w-xl fr-mb-4w">
    <label class="fr-label" for="intervention-start-date"
      >Date de début d’intervention *<span class="fr-hint-text"
        >La date de début d'intervention correspond à la date de début des travaux (y compris
        travaux préparatoires), de début du suivi dans le cas des suivis scientifiques...</span
      ></label
    >
    <input
      class="fr-input"
      id="intervention-start-date"
      type="date"
      required
      bind:value={model.interventionStartDate}
    />
  </div>
  <div class="fr-input-group max-w-xl fr-mb-4w">
    <label class="fr-label" for="intervention-end-date"
      >Date de fin d’intervention *<span class="fr-hint-text"
        >La date de fin d'intervention correspond à la date de fin des inventaires, des travaux
        avant mise en service...</span
      ></label
    >
    <input
      class="fr-input"
      id="intervention-end-date"
      type="date"
      required
      min={model.interventionStartDate || undefined}
      bind:value={model.interventionEndDate}
    />
  </div>
  <div class="fr-input-group max-w-xl fr-mb-4w">
    <label class="fr-label" for="commissioning-date"
      >Date de mise en service<span class="fr-hint-text">Date de début d'exploitation</span></label
    >
    <input
      class="fr-input"
      id="commissioning-date"
      type="date"
      bind:value={model.commissioningDate}
    />
  </div>
  {#if showsDerogationDuration(model)}
    <div class="fr-input-group max-w-xl">
      <label class="fr-label" for="intervention-duration"
        >Durée de la dérogation (en années)<span class="fr-hint-text"
          >Ce champ est notamment à remplir pour les dérogations pluriannuelles ou pour indiquer la
          durée d'exploitation de l'aménagement réalisé (en années).</span
        ><span class="fr-hint-text">Ce nombre doit être positif.</span></label
      >
      <input
        class="fr-input"
        id="intervention-duration"
        type="number"
        min="0.001"
        step="0.001"
        bind:value={model.interventionDuration}
      />
    </div>
  {/if}
</section>
