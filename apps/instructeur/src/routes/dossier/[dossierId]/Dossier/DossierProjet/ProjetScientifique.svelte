<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  type Props = { dossier: DossierFull };
  let { dossier }: Props = $props();
  const finalites = $derived(dossier.scientifique_demande_purposes as string[] | undefined);
  const intervenants = $derived(
    dossier.scientifique_intervenants as
      { nom_complet: string; qualification: string }[] | undefined,
  );
</script>

{#if dossier.scientifique_demande_type}
  <h2 class="fr-mt-6w">Données scientifiques</h2>
  <h3>Type de demande</h3>
  <ul>
    {#each dossier.scientifique_demande_type as type}<li>{type}</li>{/each}
  </ul>
  <h3>Programme de suivi antérieur</h3>
  <p>
    {dossier.scientifique_previous_assessment === null
      ? "Non renseigné"
      : dossier.scientifique_previous_assessment
        ? "Oui"
        : "Non"}
  </p>
  <h3>Finalité de la demande</h3>
  {#if finalites?.length}<ul>
      {#each finalites as finalite}<li>{finalite}</li>{/each}
    </ul>{:else}Non renseigné{/if}
  <h3>Protocole de suivi</h3>
  <p>{dossier.scientifique_suivi_protocol_description ?? "Non renseigné"}</p>
  <h3>Méthodes</h3>
  <p>
    <strong>Modes de capture&nbsp;:</strong>
    {dossier.scientifique_capture_mode?.length
      ? dossier.scientifique_capture_mode.join(", ")
      : "Non renseignées"}
  </p>
  <p>
    <strong>Source lumineuse&nbsp;:</strong>
    {dossier.scientifique_light_source_conditions ?? "Non renseignée"}
  </p>
  <p>
    <strong>Marquage&nbsp;:</strong>
    {dossier.scientifique_marking_conditions ?? "Non renseigné"}
  </p>
  <p>
    <strong>Transport&nbsp;:</strong>
    {dossier.scientifique_transport_conditions ?? "Non renseigné"}
  </p>
  <h3>Périmètre et intervenant.e.s</h3>
  <p>
    <strong>Périmètre&nbsp;:</strong>
    {dossier.scientifique_intervention_perimeter ?? "Non renseigné"}
  </p>
  <p>
    <strong>Intervenant.e.s&nbsp;:</strong>
    {#if intervenants?.length}{#each intervenants as person}{person.nom_complet} - {person.qualification}{/each}{:else}Non
      renseigné.e.s{/if}
  </p>
  <p>
    <strong>Précisions&nbsp;:</strong>
    {dossier.scientifique_other_intervenants_details ?? "Non renseignées"}
  </p>
{/if}
