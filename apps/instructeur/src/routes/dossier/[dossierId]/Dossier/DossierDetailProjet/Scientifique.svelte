<script lang="ts">
  import ProjectField from "./ProjectField.svelte";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  let {
    dossier,
    modifiedFields,
  }: { dossier: DossierFull; modifiedFields: Map<string, FieldChange> } = $props();
  const fields = $derived([
    ["Type de demande scientifique", dossier.scientifique_demande_type],
    ["Bilan des opérations antérieures", dossier.scientifique_previous_assessment],
    ["Finalités de la demande scientifique", dossier.scientifique_demande_purposes],
    ["Description du protocole de suivi", dossier.scientifique_suivi_protocol_description],
    ["Mode de capture", dossier.scientifique_capture_mode],
    ["Modalités des sources lumineuses", dossier.scientifique_light_source_conditions],
    ["Modalités de marquage", dossier.scientifique_marking_conditions],
    ["Modalités de transport", dossier.scientifique_transport_conditions],
    ["Périmètre d'intervention", dossier.scientifique_intervention_perimeter],
    ["Intervenants", dossier.scientifique_intervenants],
    ["Précisions sur les autres intervenants", dossier.scientifique_other_intervenants_details],
    ["Mesures prises en cas de mortalité", dossier.scientifique_mortality_measures_taken],
    ["Précisions sur les mesures de mortalité", dossier.scientifique_mortality_measures_details],
  ] as const);
</script>

{#if dossier.scientifique_demande_type || fields.some(([label]) => modifiedFields.has(label))}
  <h4 class="dossier-review-left fr-mt-4w fr-text--md font-bold">Données scientifiques</h4>
  {#each fields as [label, value]}
    <ProjectField dossierId={dossier.id} {label} {value} change={modifiedFields.get(label)} />
  {/each}
{/if}
