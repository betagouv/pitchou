<script lang="ts">
  import debounce from "just-debounce-it";
  import { updateDossier } from "$lib/dossier/dossier.ts";
  import PhaseTimeline from "./DossierInstruction/PhaseTimeline.svelte";
  import DossierInstructionFields from "./DossierInstruction/DossierInstructionFields.svelte";
  import Commentaires from "./DossierInstruction/Commentaires.svelte";
  import { dateToInputValue, ddepCompositeValue } from "./DossierInstruction/fieldValues.ts";
  import { readOnlyMode } from "./readOnly.ts";
  import type { DossierFull, DossierPhase } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
  };
  let { dossier, email }: Props = $props();

  const readOnly = readOnlyMode();

  const currentPhase = $derived(dossier.evenementsPhase[0]?.phase || "Accompagnement amont");

  // What the instructeur edited and has not seen saved yet, champ by champ. Each
  // champ shows its pending edit if it has one, the dossier's value otherwise:
  // the dossier object is replaced wholesale — the header setting the échéance,
  // a background refresh bringing what a colleague saved — and only the champs
  // actually holding an unsaved edit must resist the replacement.
  let edits: Partial<DossierFull> = $state({});
  // The phase is not a column of the dossier but the head of `evenementsPhase`,
  // so its pending edit lives apart.
  let phaseEdit: DossierPhase | undefined = $state();

  function champ<Key extends keyof DossierFull>(key: Key): DossierFull[Key] {
    return key in edits ? (edits[key] as DossierFull[Key]) : dossier[key];
  }

  const phase = $derived(phaseEdit ?? currentPhase);
  const enjeu = $derived(champ("enjeu"));
  const ddepRequired = $derived(champ("ddep_required"));
  const erMesuresSufficient = $derived(champ("er_mesures_sufficient"));
  const nextActionExpectedFrom = $derived(champ("next_action_expected_from"));
  const nextActionExpected = $derived(champ("next_action_expected"));
  const nextDueDate = $derived(champ("next_due_date"));
  const onagreDemandeIdentifier = $derived(champ("onagre_demande_identifier"));
  const publicConsultationStartDate = $derived(champ("public_consultation_start_date"));
  const publicConsultationEndDate = $derived(champ("public_consultation_end_date"));
  const ddepValue = $derived(ddepCompositeValue(ddepRequired, erMesuresSufficient));

  let errorMessage = $state("");
  let showSuccessMessage = $state(false);

  const dateChamps: ReadonlySet<keyof DossierFull> = new Set([
    "next_due_date",
    "public_consultation_start_date",
    "public_consultation_end_date",
  ]);

  function isUnchanged(key: keyof DossierFull, value: unknown): boolean {
    if (key === "evenementsPhase") return false;
    if (dateChamps.has(key))
      return (
        dateToInputValue(dossier[key] as Date | null) === dateToInputValue(value as Date | null)
      );
    // An absent Onagre number is null on the dossier but empty in the input, so
    // both sides are compared as strings.
    if (key === "onagre_demande_identifier") return (dossier[key] ?? "") === value;
    return dossier[key] === value;
  }

  /** A save is settled — saved, failed, or skipped: only newer edits survive it. */
  function settleEdits(sent: Partial<DossierFull>) {
    for (const key of Object.keys(sent) as (keyof DossierFull)[]) {
      if (key === "evenementsPhase") {
        if (sent.evenementsPhase?.[0]?.phase === phaseEdit) phaseEdit = undefined;
      } else if (key === "onagre_demande_identifier") {
        if ((edits.onagre_demande_identifier ?? "").trim() === sent.onagre_demande_identifier)
          delete edits.onagre_demande_identifier;
      } else if (key in edits && edits[key] === sent[key]) {
        delete edits[key];
      }
    }
  }

  function save(updates: Partial<DossierFull>) {
    const changed = Object.fromEntries(
      Object.entries(updates).filter(
        ([key, value]) => !isUnchanged(key as keyof DossierFull, value),
      ),
    ) as Partial<DossierFull>;
    if (Object.keys(changed).length === 0) {
      // Re-picking the value the dossier already holds saves nothing.
      settleEdits(updates);
      return;
    }
    updateDossier(dossier, changed)
      .then(() => (showSuccessMessage = true))
      .catch((error) => {
        console.info(error);
        errorMessage = "Quelque chose s'est mal passé du côté serveur.";
      })
      .finally(() => settleEdits(updates));
  }

  // The champs of one gesture arrive as separate writes — picking « Non, mesures
  // ER suffisantes » writes ddep_required and er_mesures_sufficient, the next
  // action select writes the entity and the action — so a microtask gathers them
  // into a single save, and a single historique entry.
  let queuedUpdates: Partial<DossierFull> | undefined;
  function queueSave(updates: Partial<DossierFull>) {
    // The fields are disabled in read-only mode; the guard covers any stray write.
    if (readOnly.current) return;
    Object.assign(edits, updates);
    if (queuedUpdates) {
      Object.assign(queuedUpdates, updates);
      return;
    }
    queuedUpdates = { ...updates };
    queueMicrotask(() => {
      const batch = queuedUpdates!;
      queuedUpdates = undefined;
      save(batch);
    });
  }

  // The Onagre number is typed character by character, clearing it included, so
  // its save waits for the typing to pause — and reads the champ again when it
  // fires, in case the dossier changed underneath in the meantime.
  const saveOnagre = debounce(() => {
    save({ onagre_demande_identifier: (champ("onagre_demande_identifier") ?? "").trim() });
  }, 1000);

  function setOnagre(value: string | null | undefined) {
    if (readOnly.current) return;
    edits.onagre_demande_identifier = value ?? "";
    saveOnagre();
  }

  function setPhase(value: string) {
    if (readOnly.current) return;
    // The options come from the `phases` list, so the value is a DossierPhase.
    const phase = value as DossierPhase;
    phaseEdit = phase;
    if (phase === currentPhase) return;
    save({
      evenementsPhase: [
        {
          dossier: dossier.id,
          timestamp: new Date(),
          phase,
          caused_by_personne: null,
          demarche_numerique_agent_email: null,
          demarche_numerique_motivation: null,
        },
      ],
    });
  }

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
  bind:enjeu={() => enjeu, (value) => queueSave({ enjeu: value ?? null })}
  bind:ddepValue={
    () => ddepValue,
    // Derived from ddep_required and er_mesures_sufficient, which the same
    // gesture writes through their own bindings.
    () => {}
  }
  bind:ddep={() => ddepRequired, (value) => queueSave({ ddep_required: value ?? null })}
  bind:erSufficient={
    () => erMesuresSufficient, (value) => queueSave({ er_mesures_sufficient: value ?? null })
  }
  bind:phase={() => phase, setPhase}
  bind:nextAction={
    () => nextActionExpectedFrom, (value) => queueSave({ next_action_expected_from: value ?? null })
  }
  bind:nextActionExpected={
    () => nextActionExpected, (value) => queueSave({ next_action_expected: value ?? null })
  }
  bind:nextDueDate={() => nextDueDate, (value) => queueSave({ next_due_date: value ?? null })}
  bind:onagre={() => onagreDemandeIdentifier, setOnagre}
  bind:consultationStart={
    () => publicConsultationStartDate,
    (value) => queueSave({ public_consultation_start_date: value ?? null })
  }
  bind:consultationEnd={
    () => publicConsultationEndDate,
    (value) => queueSave({ public_consultation_end_date: value ?? null })
  }
  dismiss={dismissAlert}
  disabled={readOnly.current}
/>

<!-- Commentaires are internal to the service and never shared. -->
{#if !readOnly.current}
  <Commentaires {dossier} {email} />
{/if}
