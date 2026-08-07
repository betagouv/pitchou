<script lang="ts">
  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
  import { untrack } from "svelte";

  import { addOrUpdateAvisExpert } from "../avisExpert.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import AvisExpertFields from "./AvisExpertFields.svelte";

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
    untrack(() =>
      avisExpert?.expert && ["CSRPN", "CNPN", "Ministre"].includes(avisExpert.expert)
        ? avisExpert.expert
        : "Autre expert",
    ),
  );

  let otherExpertText: string | null = $state(
    untrack(() =>
      avisExpert?.expert && ["CSRPN", "CNPN", "Ministre"].includes(avisExpert.expert)
        ? null
        : (avisExpert?.expert ?? ""),
    ),
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
    <AvisExpertFields
      {dossierId}
      initial={avisExpertInitial}
      bind:avis={avisExpert}
      bind:service={serviceOuPersonneExperte}
      bind:otherExpert={otherExpertText}
      bind:saisineFiles={fileListFichierSaisine}
      bind:avisFiles={fileListFichierAvis}
    />
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
