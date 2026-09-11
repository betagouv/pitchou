<script lang="ts">
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";
  import Scientifique from "./Scientifique.svelte";
  import ProjectField from "./ProjectField.svelte";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import { applicantFieldLabels } from "@pitchou/types/notification.ts";

  let {
    dossier,
    modifiedFields = new Map(),
  }: { dossier: DossierFull; modifiedFields?: Map<string, FieldChange> } = $props();
  const fields = $derived([
    ["Nom du projet", dossier.name],
    ["Activité principale", dossier.activite_label],
    ["Téléphone en cas de demande urgente", dossier.urgent_contact_phone],
    ["Situation du demandeur", dossier.request_context],
    ["Besoin d'accompagnement", dossier.accompaniment_need],
    ["État des lieux écologique", dossier.ecological_inventory_completed],
    [
      "Présence d'espèces protégées dans l'aire d'influence",
      dossier.especes_present_in_influence_area,
    ],
    ["Risque malgré les mesures d'évitement et de réduction", dossier.risk_despite_erc_mesures],
    ["Description", dossier.description],
    [
      "Synthèse des éléments démontrant qu'il n'existe aucune alternative",
      dossier.no_other_satisfactory_solution_justification,
    ],
    ["Motif de la dérogation", dossier.motif_derogation],
    [
      "Synthèse des éléments justifiant le motif de la dérogation",
      dossier.motif_derogation_justification,
    ],
    ["Date de début d'intervention ou des travaux", dossier.intervention_start_date],
    ["Date de fin d'intervention ou des travaux", dossier.intervention_end_date],
    ["Date de mise en service de l'exploitation", dossier.commissioning_date],
    [
      "Durée de la dérogation",
      dossier.intervention_duration == null ? null : `${dossier.intervention_duration} années`,
    ],
  ] as const);
  const additionalFields = $derived(
    Object.entries(applicantFieldLabels).filter(
      ([column, label]) =>
        !fields.some(([shownLabel]) => shownLabel === label) &&
        column !== "projet_map" &&
        column !== "demandeur_personne_morale" &&
        !column.startsWith("scientifique_"),
    ),
  );
  const unknownChanges = $derived(
    [...modifiedFields.values()].filter(
      (change) => !Object.values(applicantFieldLabels).includes(change.field),
    ),
  );
  const importPlatforms: Record<string, string> = {
    gunenv: "GunEnv",
    onagre: "Onagre",
    import_fichier: "un fichier du service",
  };
</script>

<p class="dossier-review-left">
  <strong>Dossier n°&nbsp;:</strong>
  {dossier.demarche_numerique_number ?? dossier.id}
</p>
{#each fields as [label, value]}
  <ProjectField dossierId={dossier.id} {label} {value} change={modifiedFields.get(label)} />
{/each}
{#each additionalFields as [column, label]}
  {@const value = dossier[column as keyof DossierFull]}
  {#if value != null || modifiedFields.has(label)}
    <ProjectField dossierId={dossier.id} {label} {value} change={modifiedFields.get(label)} />
  {/if}
{/each}
{#each unknownChanges as change (change.field)}
  <ProjectField
    dossierId={dossier.id}
    label={change.label}
    value={change.column ? dossier[change.column as keyof DossierFull] : null}
    {change}
  />
{/each}
<Scientifique {dossier} {modifiedFields} />

<div class="dossier-review-left">
  <h4 class="fr-mt-4w fr-text--md font-bold">Dossier déposé</h4>
  {#if dossier.source === "demarche_numerique"}
    {#if dossier.demarche_numerique_number && dossier.demarche_number}
      <a
        class="fr-btn fr-btn--secondary fr-mb-1w"
        target="_blank"
        href={`${originDemarcheNumerique}/procedures/${dossier.demarche_number}/dossiers/${dossier.demarche_numerique_number}`}
        >Dossier sur Démarche Numérique</a
      >
    {:else}<p class="fr-text-mention--grey">
        Ce dossier provient de Démarches Numériques, mais son lien n'est pas disponible.
      </p>{/if}
  {:else if dossier.source === "pitchou"}
    <p class="fr-text-mention--grey">
      Ce dossier a été créé directement dans Pitchou, sans dépôt sur Démarches Numériques.
    </p>
  {:else if importPlatforms[dossier.source]}
    <p class="fr-text-mention--grey">
      Ce dossier a été importé depuis {importPlatforms[dossier.source]}.
    </p>
  {:else}<p class="fr-text-mention--grey">La source de ce dossier est inconnue.</p>{/if}
</div>
