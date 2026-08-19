<script lang="ts">
  import { run } from "svelte/legacy";
  import debounce from "just-debounce-it";
  import { updateDossier } from "$lib/dossier/dossier.ts";
  import PhaseTimeline from "./DossierInstruction/PhaseTimeline.svelte";
  import DossierInstructionFields from "./DossierInstruction/DossierInstructionFields.svelte";
  import Commentaires from "./DossierInstruction/Commentaires.svelte";
  import { dateToInputValue, ddepCompositeValue } from "./DossierInstruction/fieldValues.ts";
  import { readOnlyMode } from "./readOnly.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
  };
  let { dossier, email }: Props = $props();

  const readOnly = readOnlyMode();

  const currentPhase = $derived(dossier.evenementsPhase[0]?.phase || "Accompagnement amont");
  // Every champ mirrors the dossier: what the instructeur types wins until the
  // dossier itself changes — the header setting the échéance, a background refresh
  // bringing what a colleague saved — and then the fresher value takes over. A
  // value seeded once could not tell an edit from a change received underneath, so
  // the reconciliation below pushed the champ it still held back over it.
  let phase = $derived(currentPhase);
  let ddepRequired = $derived(dossier.ddep_required);
  let erMesuresSufficient = $derived(dossier.er_mesures_sufficient);
  let enjeu = $derived(dossier.enjeu);
  let nextActionExpectedFrom = $derived(dossier.next_action_expected_from);
  let nextActionExpected = $derived(dossier.next_action_expected);
  let nextDueDate = $derived(dossier.next_due_date);
  let onagreDemandeIdentifier = $derived(dossier.onagre_demande_identifier);
  let publicConsultationStartDate = $derived(dossier.public_consultation_start_date);
  let publicConsultationEndDate = $derived(dossier.public_consultation_end_date);
  let ddepValue = $derived(ddepCompositeValue(ddepRequired, erMesuresSufficient));
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
    // The fields are disabled in read-only mode, but the guard also covers the
    // reconciliation that runs when the dossier itself changes.
    if (readOnly.current) return;

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
    if (dossier.next_action_expected !== (nextActionExpected ?? null))
      updates.next_action_expected = nextActionExpected ?? null;
    if (dateToInputValue(dossier.next_due_date) !== dateToInputValue(nextDueDate))
      updates.next_due_date = nextDueDate ?? null;
    // An absent Onagre number is null on the dossier but empty in the input, so
    // both sides are compared as strings — otherwise `null !== undefined` made
    // every mount look like a change and saved the dossier for nothing.
    const onagre = onagreDemandeIdentifier?.trim() ?? "";
    if ((dossier.onagre_demande_identifier ?? "") !== onagre)
      updates.onagre_demande_identifier = onagre;
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
      // The Onagre number is typed character by character, clearing it included.
      if ("onagre_demande_identifier" in updates) updateFieldWithDebounce(updates);
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
  bind:nextActionExpected
  bind:nextDueDate
  bind:onagre={onagreDemandeIdentifier}
  bind:consultationStart={publicConsultationStartDate}
  bind:consultationEnd={publicConsultationEndDate}
  dismiss={dismissAlert}
  disabled={readOnly.current}
/>

<!-- Commentaires are internal to the service and never shared. -->
{#if !readOnly.current}
  <Commentaires {dossier} {email} />
{/if}
