<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import Prescription from "./Prescription.svelte";
  import PrescriptionsEditTable from "./PrescriptionsEditTable.svelte";

  import toJSONPerserveDate from "@pitchou/common/DateToJSON.js";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";

  import {
    deletePrescription as deletePrescriptionDatabase,
    addPrescription as addPrescriptionDatabase,
    updatePrescription,
  } from "./prescriptions.ts";
  import { createPrescriptionControlesFromFichier } from "./decisionAdministrative.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";

  import type {
    FrontEndDecisionAdministrative,
    FrontEndPrescription,
  } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type PrescriptionType from "@pitchou/types/database/public/Prescription.ts";

  type Props = {
    dossierId: Dossier["id"];
    decisionAdministrative: FrontEndDecisionAdministrative;
  };

  let { dossierId, decisionAdministrative }: Props = $props();

  // Local list, initialized once from the décision then mutated in place
  // (add / remove / import). Intentionally not reactive to the prop.
  // A $state array (not a SvelteSet) so each prescription object is deeply
  // reactive: the edit table binds to individual properties.
  // svelte-ignore state_referenced_locally
  let prescriptions: Partial<FrontEndPrescription>[] = $state(
    decisionAdministrative.prescriptions ? [...decisionAdministrative.prescriptions] : [],
  );

  let viewPrescription: "view" | "edit" = $state("view");

  // Numeric columns of the edit table: all displayed and edited the same way
  const NUMERIC_COLUMNS = [
    { key: "compensated_surface", label: "Surface compensée (m²)" },
    { key: "avoided_surface", label: "Surface évitée (m²)" },
    { key: "compensated_individus", label: "Individus compensés" },
    { key: "avoided_individus", label: "Individus évités" },
    { key: "compensated_nids", label: "Nids compensés" },
    { key: "avoided_nids", label: "Nids évités" },
  ] as const satisfies readonly { key: keyof FrontEndPrescription; label: string }[];

  function addPrescription() {
    const newPrescription: Partial<PrescriptionType> = {
      decision_administrative: decisionAdministrative.id,
      due_date: undefined,
      article_number: "",
      description: "",
      compensated_individus: undefined,
      avoided_individus: undefined,
      compensated_nids: undefined,
      avoided_nids: undefined,
      compensated_surface: undefined,
      avoided_surface: undefined,
    };

    prescriptions.push(newPrescription);

    viewPrescription = "edit";
  }

  const prescriptionToPendingIdAndLatestData = new SvelteMap<
    Partial<PrescriptionType>,
    {
      prescriptionIdP: Promise<PrescriptionType["id"] | undefined>;
      updateAfterRecievingId: boolean;
    }
  >();

  async function savePrescription(prescription: Partial<FrontEndPrescription>) {
    if (prescription.due_date) {
      Object.defineProperty(prescription.due_date, "toJSON", { value: toJSONPerserveDate });
    }

    if (prescription.id) {
      // "contrôles" is a property of the FrontEndPrescription type, not a property of the Prescription type
      // which causes a problem when inserting/updating the prescription in the database
      const { controles, ...prescriptionWithoutControles } = prescription;
      updatePrescription(prescriptionWithoutControles);
    } else {
      const pendingPrescriptionIdEntry = prescriptionToPendingIdAndLatestData.get(prescription);
      if (pendingPrescriptionIdEntry) {
        pendingPrescriptionIdEntry.updateAfterRecievingId = true;
      } else {
        const prescriptionIdP: Promise<PrescriptionType["id"] | undefined> =
          addPrescriptionDatabase(prescription);

        const newPendingPrescriptionIdEntry = {
          prescriptionIdP,
          updateAfterRecievingId: false,
        };

        prescriptionToPendingIdAndLatestData.set(prescription, newPendingPrescriptionIdEntry);

        // @ts-ignore
        prescription.id = (await prescriptionIdP).prescriptionId;

        // May have changed during the await
        const updateAfterRecievingId = newPendingPrescriptionIdEntry.updateAfterRecievingId;

        prescriptionToPendingIdAndLatestData.delete(prescription);

        if (updateAfterRecievingId) updatePrescription(prescription);
      }
    }
  }

  function deletePrescription(prescription: Partial<PrescriptionType>) {
    if (prescription.id) {
      deletePrescriptionDatabase(prescription.id);
    }

    prescriptions = prescriptions.filter((p) => p !== prescription);
  }

  async function onFileInput(e: Event & { currentTarget: HTMLElement & HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const importPrescriptionFileAB = await file.arrayBuffer();
    const newPrescriptions = await createPrescriptionControlesFromFichier(
      importPrescriptionFileAB,
      decisionAdministrative,
    );

    prescriptions = newPrescriptions;
    refreshDossierFull(dossierId);
  }
</script>

<section>
  {#if prescriptions.length === 0}
    <h5 class="fr-mb-2w">Prescriptions</h5>
    <section class="fr-mb-3w">
      <p>Il n'y a pas de prescriptions associées à cette décision administrative pour le moment</p>

      <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={addPrescription}>
        Ajouter une prescription
      </button>
    </section>

    <section class="fr-mb-4w">
      <h6>Import d'un fichier de prescriptions</h6>
      <div class="fr-upload-group">
        <label class="fr-label" for="file-upload">
          Importer un fichier de prescriptions. Un <a
            href="/data/modèles/modèle ajout prescriptions.ods">modèle est disponible</a
          >. Il est important de garder les noms de colonnes (mais pas forcément l'ordre et elles
          sont toutes optionnelles)
          <span class="fr-hint-text">{uploadSizeHint()} Formats supportés : .ods</span>
        </label>
        <input
          oninput={onFileInput}
          class="fr-upload"
          type="file"
          accept=".ods"
          id="file-upload"
          name="file-upload"
        />
      </div>
    </section>
  {:else}
    <h5 class="fr-mb-2w">{prescriptions.length} prescriptions</h5>

    {#if viewPrescription === "view"}
      {#each prescriptions as prescription}
        <Prescription {prescription} refreshDossierFull={() => refreshDossierFull(dossierId)}
        ></Prescription>
      {/each}

      <button
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-ball-pen-line"
        onclick={() => (viewPrescription = "edit")}
      >
        Modifier les prescriptions
      </button>
    {:else}
      <PrescriptionsEditTable
        {prescriptions}
        columns={NUMERIC_COLUMNS}
        save={savePrescription}
        remove={deletePrescription}
        add={addPrescription}
        finish={() => (viewPrescription = "view")}
      />
    {/if}
  {/if}
</section>
