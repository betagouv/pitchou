<script lang="ts">
  import { SvelteSet, SvelteMap } from "svelte/reactivity";
  import DateInput from "../../DateInput.svelte";
  import Prescription from "./Prescription.svelte";

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

  // Local set, initialized once from the décision then mutated in place
  // (add / remove / import). Intentionally not reactive to the prop.
  // svelte-ignore state_referenced_locally
  let prescriptions: Set<Partial<FrontEndPrescription>> = $state(
    decisionAdministrative.prescriptions
      ? new SvelteSet(decisionAdministrative.prescriptions)
      : new SvelteSet(),
  );

  let viewPrescription: "view" | "edit" = $state("view");

  // Numeric columns of the edit table: all displayed and edited the same way
  const NUMERIC_COLUMNS = [
    { key: "surface_compensée", label: "Surface compensée (m²)" },
    { key: "surface_évitée", label: "Surface évitée (m²)" },
    { key: "individus_compensés", label: "Individus compensés" },
    { key: "individus_évités", label: "Individus évités" },
    { key: "nids_compensés", label: "Nids compensés" },
    { key: "nids_évités", label: "Nids évités" },
  ] as const satisfies readonly { key: keyof FrontEndPrescription; label: string }[];

  function addPrescription() {
    const newPrescription: Partial<PrescriptionType> = {
      décision_administrative: decisionAdministrative.id,
      date_échéance: undefined,
      numéro_article: "",
      description: "",
      individus_compensés: undefined,
      individus_évités: undefined,
      nids_compensés: undefined,
      nids_évités: undefined,
      surface_compensée: undefined,
      surface_évitée: undefined,
    };

    prescriptions.add(newPrescription);

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
    if (prescription.date_échéance) {
      Object.defineProperty(prescription.date_échéance, "toJSON", { value: toJSONPerserveDate });
    }

    if (prescription.id) {
      // "contrôles" is a property of the FrontEndPrescription type, not a property of the Prescription type
      // which causes a problem when inserting/updating the prescription in the database
      const { contrôles: controles, ...prescriptionWithoutControles } = prescription;
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

    prescriptions.delete(prescription);
  }

  async function onFileInput(e: Event & { currentTarget: HTMLElement & HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const importPrescriptionFileAB = await file.arrayBuffer();
    const newPrescriptions = await createPrescriptionControlesFromFichier(
      importPrescriptionFileAB,
      decisionAdministrative,
    );

    prescriptions = new Set(newPrescriptions);
    refreshDossierFull(dossierId);
  }
</script>

<section class="prescriptions">
  {#if prescriptions.size === 0}
    <h5>Prescriptions</h5>
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
    <h5>{prescriptions.size} prescriptions</h5>

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
      <table class="prescriptions">
        <thead>
          <tr>
            <th>Numéro article</th>
            <th>Description</th>
            <th>Date échéance</th>
            {#each NUMERIC_COLUMNS as column}
              <th>{column.label}</th>
            {/each}
            <th>Supprimer</th>
          </tr>
        </thead>
        <tbody>
          {#each prescriptions as prescription}
            <tr
              class="prescription"
              onfocusout={(e) => {
                //@ts-ignore
                if (!e.target?.classList.contains("button-delete")) {
                  savePrescription(prescription);
                }
              }}
            >
              <td><input class="fr-input" bind:value={prescription.numéro_article} /></td>
              <td><input class="fr-input" bind:value={prescription.description} /></td>
              <td><DateInput bind:date={prescription.date_échéance}></DateInput></td>

              {#each NUMERIC_COLUMNS as column}
                <td>
                  <input
                    class="fr-input"
                    type="number"
                    min="0"
                    bind:value={prescription[column.key]}
                  />
                </td>
              {/each}

              <td>
                <button
                  class="button-delete fr-btn fr-btn--sm fr-icon-delete-line fr-btn--icon-left fr-btn--secondary"
                  onclick={() => deletePrescription(prescription)}>Supprimer</button
                >
              </td>
            </tr>
          {/each}
          <tr>
            <td colspan={NUMERIC_COLUMNS.length + 4} class="fr-pt-1w">
              <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={addPrescription}>
                Ajouter une prescription
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <button
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-eye-line fr-mt-3w"
        onclick={() => (viewPrescription = "view")}
      >
        Modifications terminées
      </button>
    {/if}
  {/if}
</section>

<style lang="scss">
  h5 {
    margin-bottom: 1rem;
  }

  table.prescriptions {
    .prescription,
    thead > tr {
      & > * {
        margin: 0 2px;
      }

      & > :nth-child(1) {
        width: 5rem;
      }
      & > :nth-child(2) {
        width: 20rem;
      }
      & > :nth-child(3) {
        width: 9rem;
      }

      & > :nth-child(n + 4) {
        width: 6rem;
      }
    }
  }
</style>
