<script lang="ts">
  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  import { addOrUpdateAvisExpert } from "../avisExpert.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  import DateInput from "../../DateInput.svelte";

  type Props = {
    dossierId: DossierFull["id"];
    closeForm: () => void;
    avisExpertInitial?: FrontEndAvisExpert;
  };

  let { closeForm, dossierId, avisExpertInitial = $bindable() }: Props = $props();

  let avisExpert: Partial<
    Pick<FrontEndAvisExpert, "id" | "expert" | "saisine_date" | "avis" | "avis_date">
  > = $state(avisExpertInitial ?? {});

  let fileListFichierSaisine: FileList | undefined = $state();

  let fileListFichierAvis: FileList | undefined = $state();

  let errorMessage: string | null = $state(null);

  let inProgress = $state(false);

  let serviceOuPersonneExperte: string = $state(
    avisExpert?.expert && ["CSRPN", "CNPN", "Ministre"].includes(avisExpert.expert)
      ? avisExpert.expert
      : "Autre expert",
  );

  let otherExpertText: string | null = $state(
    avisExpert?.expert && ["CSRPN", "CNPN", "Ministre"].includes(avisExpert.expert)
      ? null
      : (avisExpert?.expert ?? ""),
  );

  async function saveAvisExpert(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = null;

    let fichierSaisine: File | undefined;
    let fichierAvis: File | undefined;

    if (fileListFichierSaisine && fileListFichierSaisine.length >= 1) {
      fichierSaisine = fileListFichierSaisine[0];
    }

    if (fileListFichierAvis && fileListFichierAvis.length >= 1) {
      fichierAvis = fileListFichierAvis[0];
    }

    if (serviceOuPersonneExperte) {
      if (
        serviceOuPersonneExperte === "Autre expert" &&
        otherExpertText &&
        otherExpertText.trim() !== ""
      ) {
        if (avisExpert.expert !== otherExpertText) {
          avisExpert.expert = otherExpertText;
        }
      } else {
        if (avisExpert.expert !== serviceOuPersonneExperte) {
          avisExpert.expert = serviceOuPersonneExperte;
        }
      }
    }

    const avisExpertToAddOrUpdate = avisExpertInitial?.id
      ? { id: avisExpertInitial.id, dossier: dossierId, ...avisExpert }
      : { dossier: dossierId, ...avisExpert };

    inProgress = true;
    try {
      await addOrUpdateAvisExpert(avisExpertToAddOrUpdate, fichierSaisine, fichierAvis);
      await refreshDossierFull(dossierId);
      closeForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = `L'enregistrement de l'avis a échoué : ${message}`;
    } finally {
      inProgress = false;
    }
  }
</script>

<form id="formulaire-ajouter-avis-expert" onsubmit={saveAvisExpert}>
  <fieldset
    class="fr-fieldset"
    id="formulaire-ajouter-avis-expert-fieldset"
    aria-labelledby="formulaire-ajouter-avis-expert-fieldset-legend formulaire-ajouter-avis-expert-fieldset-messages"
  >
    <legend class="fr-fieldset__legend" id="formulaire-ajouter-avis-expert-fieldset-legend">
      {#if avisExpertInitial?.id}
        Modifier l'avis
      {:else}
        Ajouter un nouvel avis d'expert
      {/if}
    </legend>
    <!-- Section Expert -->
    <h4 class="section-title fr-h6">Expert</h4>
    <div class="fr-fieldset__element">
      <fieldset class="fr-fieldset radio-service-ou-personne-experte">
        <legend class="fr-fieldset__legend">Service ou personne experte</legend>
        {#each ["CSRPN", "CNPN", "Ministre", "Autre expert"] as service}
          {@const idRadio = `service-expert-${service.replace(/\s+/g, "-").toLowerCase()}-${dossierId}`}
          <div class="fr-fieldset__element">
            <div class="fr-radio-group fr-ml-2w">
              <input
                id={idRadio}
                type="radio"
                value={service}
                name="serviceOuPersonneExperte"
                bind:group={serviceOuPersonneExperte}
                onchange={() => {
                  if (service !== "Autre expert") otherExpertText = null;
                }}
              />
              <label class="fr-label" for={idRadio}>
                {service}
              </label>
            </div>
          </div>
        {/each}
        {#if serviceOuPersonneExperte === "Autre expert"}
          <div class="fr-fieldset__element">
            <div class="fr-input-group fr-mt-3w">
              <label class="fr-label" for="autre-expert-texte">Précisez l'expert</label>
              <input
                class="fr-input"
                type="text"
                id="autre-expert-texte"
                bind:value={otherExpertText}
                placeholder="Nom de l'expert"
              />
            </div>
          </div>
        {/if}
      </fieldset>
    </div>

    <!-- Section Saisine -->
    <h4 class="section-title fr-h6">Saisine</h4>
    <div class="fr-fieldset__element">
      <div class="fr-upload-fichier-saisine-group">
        <label class="fr-label" for="upload-fichier-saisine"
          >Fichier de la saisine
          <span class="fr-hint-text"
            >Indication : {uploadSizeHint()} Formats supportés&nbsp;: pdf</span
          >
        </label>
        {#if avisExpertInitial?.saisine_fichier_url}
          <a
            class="fr-btn fr-btn--secondary fr-btn--sm"
            href={avisExpertInitial.saisine_fichier_url}
            data-sveltekit-reload
          >
            Télécharger le fichier de la saisine
          </a>
        {:else}
          <input
            accept=".pdf"
            bind:files={fileListFichierSaisine}
            class="fr-upload"
            aria-describedby="upload-fichier-saisine-messages"
            type="file"
            id="upload-fichier-saisine"
            name="upload"
          />
          <div
            class="fr-messages-group"
            id="upload-fichier-saisine-messages"
            aria-live="polite"
          ></div>
        {/if}
      </div>
    </div>
    <div class="fr-fieldset__element">
      <div class="fr-input-group fr-mt-3w" id="champ-date-saisine-group">
        <label class="fr-label" for="input-champ-date-saisine">Date saisine</label>
        <DateInput bind:date={avisExpert.saisine_date} />
      </div>
    </div>

    <!-- Section Avis -->
    <h4 class="section-title fr-h6">Avis</h4>
    <div class="fr-fieldset__element">
      <div class="fr-upload-fichier-avis-group">
        <label class="fr-label" for="upload-fichier-avis"
          >Fichier de l'avis de l'expert
          <span class="fr-hint-text"
            >Indication : {uploadSizeHint()} Formats supportés&nbsp;: pdf</span
          >
        </label>
        {#if avisExpertInitial?.avis_fichier_url}
          <a
            class="fr-btn fr-btn--secondary fr-btn--sm"
            href={avisExpertInitial.avis_fichier_url}
            data-sveltekit-reload
          >
            Télécharger le fichier de l'avis
          </a>
        {:else}
          <input
            accept=".pdf"
            bind:files={fileListFichierAvis}
            class="fr-upload"
            aria-describedby="upload-fichier-avis-messages"
            type="file"
            id="upload-fichier-avis"
            name="upload"
          />
          <div class="fr-messages-group" id="upload-fichier-avis-messages" aria-live="polite"></div>
        {/if}
      </div>
    </div>
    <div class="fr-fieldset__element">
      <div class="fr-input-group fr-mt-3w" id="champ-date-avis-group">
        <label class="fr-label" for="input-champ-date-avis">Date avis</label>
        <DateInput id={"input-champ-date-avis"} bind:date={avisExpert.avis_date} />
      </div>
    </div>
    {#if serviceOuPersonneExperte === "Ministre" || serviceOuPersonneExperte === "CNPN" || serviceOuPersonneExperte === "CSRPN"}
      <div class="fr-fieldset__element">
        <div class="fr-input-group" id="champ-avis-group">
          <p class="fr-label fr-mb-2w">Avis de l’expert</p>

          {#each ["Avis favorable", "Avis favorable tacite", "Avis favorable sous condition", "Avis défavorable"] as value}
            {@const id = `avis-${value.replace(/\s+/g, "-").toLowerCase()}`}
            <div class="fr-fieldset__element">
              <div class="fr-radio-group fr-ml-2w">
                <input type="radio" {id} name="champ-avis" {value} bind:group={avisExpert.avis} />
                <label class="fr-label" for={id}>
                  {value}
                </label>
              </div>
            </div>
          {/each}

          <div class="fr-messages-group" id="champ-avis-group-messages" aria-live="polite"></div>
        </div>
      </div>
    {/if}
    <div
      class="fr-messages-group"
      id="formulaire-ajouter-avis-expert-fieldset-messages"
      aria-live="polite"
    >
      {#if errorMessage}
        <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
          <p>{errorMessage}</p>
        </div>
      {/if}
    </div>
    <ul
      style={"width: 100%;"}
      class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-4w"
    >
      <li>
        <button type="button" class="fr-btn fr-btn--secondary" onclick={closeForm}>Annuler</button>
      </li>
      <li>
        <button type="submit" class="fr-btn" disabled={inProgress}>
          {inProgress ? "Sauvegarde en cours…" : "Sauvegarder"}
        </button>
      </li>
    </ul>
  </fieldset>
</form>

<style lang="scss">
  .radio-service-ou-personne-experte {
    margin-bottom: 0;
  }

  .section-title {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-default-grey);
    width: 100%;
    padding-bottom: 0.5rem;
  }

  .section-title:first-of-type {
    margin-top: 0;
  }
</style>
