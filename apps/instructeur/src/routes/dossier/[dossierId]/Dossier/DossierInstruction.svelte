<script lang="ts">
  import { run } from "svelte/legacy";
  import { untrack } from "svelte";
  import debounce from "just-debounce-it";
  import { updateDossier } from "$lib/dossier/dossier.ts";
  import PhaseTimeline from "./DossierInstruction/PhaseTimeline.svelte";
  import DossierInstructionFields from "./DossierInstruction/DossierInstructionFields.svelte";
  import Commentaires from "./DossierInstruction/Commentaires.svelte";
  import { dateToInputValue, ddepCompositeValue } from "./DossierInstruction/fieldValues.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
  };
  let { dossier, email }: Props = $props();

  const currentPhase = $derived(dossier.evenementsPhase[0]?.phase || "Accompagnement amont");
  let phase = $derived(currentPhase);
  let ddepRequired = $state(untrack(() => dossier.ddep_required));
  let erMesuresSufficient = $state(untrack(() => dossier.er_mesures_sufficient));
  let enjeu = $state(untrack(() => dossier.enjeu));
  let nextActionExpectedFrom = $state(untrack(() => dossier.next_action_expected_from));
  let nextDueDate = $state(untrack(() => dossier.next_due_date));
  let onagreDemandeIdentifier = $state(untrack(() => dossier.onagre_demande_identifier));
  let publicConsultationStartDate = $state(untrack(() => dossier.public_consultation_start_date));
  let publicConsultationEndDate = $state(untrack(() => dossier.public_consultation_end_date));
  let ddepValue = $state(untrack(() => ddepCompositeValue(ddepRequired, erMesuresSufficient)));
  let errorMessage = $state("");
  let showSuccessMessage = $state(false);

  const updateField = (updates: Partial<DossierFull>) => {
    updateDossier(dossier, updates)
      .then(() => (showSuccessMessage = true))
      .catch((error) => {
        console.info(error);
        errorMessage = "Quelque chose s'est mal passé du côté serveur.";
      });
  };
  const updateFieldWithDebounce = debounce(updateField, 1000);

  run(() => {
    const updates: Partial<DossierFull> = {};
    if (currentPhase !== phase) {
      updates.evenementsPhase = [
        {
          dossier: dossier.id,
          timestamp: new Date(),
          phase,
          caused_by_personne: null,
          demarche_numerique_agent_email: null,
          demarche_numerique_motivation: null,
        },
      ];
    }
    if (dossier.next_action_expected_from !== nextActionExpectedFrom)
      updates.next_action_expected_from = nextActionExpectedFrom;
    if (dateToInputValue(dossier.next_due_date) !== dateToInputValue(nextDueDate))
      updates.next_due_date = nextDueDate ?? null;
    if (dossier.onagre_demande_identifier !== onagreDemandeIdentifier?.trim())
      updates.onagre_demande_identifier = onagreDemandeIdentifier?.trim();
    if (dossier.enjeu !== enjeu) updates.enjeu = enjeu;
    if (dossier.ddep_required !== ddepRequired) updates.ddep_required = ddepRequired;
    if (dossier.er_mesures_sufficient !== erMesuresSufficient)
      updates.er_mesures_sufficient = erMesuresSufficient;
    if (
      dateToInputValue(dossier.public_consultation_start_date) !==
      dateToInputValue(publicConsultationStartDate)
    )
      updates.public_consultation_start_date = publicConsultationStartDate ?? null;
    if (
      dateToInputValue(dossier.public_consultation_end_date) !==
      dateToInputValue(publicConsultationEndDate)
    )
      updates.public_consultation_end_date = publicConsultationEndDate ?? null;
    if (ddepRequired === null && dossier.er_mesures_sufficient !== null)
      updates.er_mesures_sufficient = null;
    if (Object.keys(updates).length) {
      if (updates.onagre_demande_identifier) updateFieldWithDebounce(updates);
      else updateField(updates);
    }
  });

  const dismissAlert = () => {
    errorMessage = "";
    showSuccessMessage = false;
  };
</script>

{#if errorMessage}<div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
    <p>{errorMessage}</p>
  </div>{/if}
{#if showSuccessMessage}<div class="fr-alert fr-alert--success fr-mb-3w">
    <p>Le dossier a bien été mis à jour.</p>
  </div>{/if}

<section class="fr-mb-4w">
  <h2 class="fr-mb-3w fr-text--lg">Avancement du dossier</h2>
  <PhaseTimeline events={dossier.evenementsPhase} depotDate={dossier.depot_date} />
</section>

<DossierInstructionFields
  bind:enjeu
  bind:ddepValue
  bind:ddep={ddepRequired}
  bind:erSufficient={erMesuresSufficient}
  bind:phase
  bind:nextAction={nextActionExpectedFrom}
  bind:nextDueDate
  bind:onagre={onagreDemandeIdentifier}
  bind:consultationStart={publicConsultationStartDate}
  bind:consultationEnd={publicConsultationEndDate}
  dismiss={dismissAlert}
/>

<Commentaires {dossier} {email} />
