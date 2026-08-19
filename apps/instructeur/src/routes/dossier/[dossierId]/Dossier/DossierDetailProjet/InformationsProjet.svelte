<script lang="ts">
  import { formatDateRelative } from "$lib/dossier/displayDossier.ts";
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";
  import Scientifique from "./Scientifique.svelte";
  import Cartographie from "./Cartographie.svelte";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = { dossier: DossierFull };
  let { dossier }: Props = $props();

  function displayBoolean(value: boolean | null | undefined): string {
    return typeof value === "boolean" ? (value ? "Oui" : "Non") : "Non renseigné";
  }
</script>

<p>
  <strong>Dossier n°&nbsp;:</strong>
  {dossier.demarche_numerique_number ?? dossier.id}
</p>
<p><strong>Activité&nbsp;:</strong> {dossier.main_activite ?? "Non renseignée"}</p>
{#if dossier.urgent_contact_phone}<p>
    <strong>Téléphone en cas de demande urgente&nbsp;:</strong>
    {dossier.urgent_contact_phone}
  </p>{/if}
{#if dossier.request_context}<p>
    <strong>Situation du demandeur&nbsp;:</strong>
    {dossier.request_context}
  </p>{/if}
{#if dossier.accompaniment_need}<p>
    <strong>Besoin d'accompagnement&nbsp;:</strong>
    {dossier.accompaniment_need}
  </p>{/if}
<p>
  <strong>Un état des lieux écologique complet a-t-il été réalisé ?&nbsp;:</strong>
  {displayBoolean(dossier.ecological_inventory_completed)}
</p>
<p>
  <strong
    >Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence du
    projet ?&nbsp;:</strong
  >
  {displayBoolean(dossier.especes_present_in_influence_area)}
</p>
<p>
  <strong
    >Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment
    caractérisé pour les espèces protégées demeure-t-il ?&nbsp;:</strong
  >
  {displayBoolean(dossier.risk_despite_erc_mesures)}
</p>
<p>
  <strong>Description&nbsp;:</strong>
  {dossier.description?.length ? dossier.description : "Non renseignée"}
</p>
<p>
  <strong
    >Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet&nbsp;:</strong
  >
  {dossier.no_other_satisfactory_solution_justification?.length
    ? dossier.no_other_satisfactory_solution_justification
    : "Non renseignée"}
</p>
<p><strong>Motif de la dérogation&nbsp;:</strong> {dossier.motif_derogation ?? "Non renseigné"}</p>
<p>
  <strong>Synthèse des éléments justifiant le motif de la dérogation&nbsp;:</strong>
  {dossier.motif_derogation_justification?.length
    ? dossier.motif_derogation_justification
    : "Non renseignée"}
</p>
{#each [["Date de début d'intervention ou des travaux", dossier.intervention_start_date], ["Date de fin d'intervention ou des travaux", dossier.intervention_end_date], ["Date de mise en service de l'exploitation", dossier.commissioning_date]] as item}
  <p>
    <strong>{item[0]}&nbsp;:</strong>
    {#if item[1]}<time datetime={new Date(item[1]).toISOString()}
        >{formatDateRelative(new Date(item[1]))}</time
      >{:else}Non renseignée{/if}
  </p>
{/each}
<p>
  <strong>Durée de la dérogation&nbsp;:</strong>
  {dossier.intervention_duration ? `${dossier.intervention_duration} années` : "Non renseignée"}
</p>

<Scientifique {dossier} />

<Cartographie {dossier} />

<h4 class="fr-mt-4w fr-text--md font-bold">Dossier déposé</h4>
{#if dossier.source === "demarche_numerique"}
  {#if dossier.demarche_numerique_number && dossier.demarche_number}<a
      class="fr-btn fr-btn--secondary fr-mb-1w"
      target="_blank"
      href={`${originDemarcheNumerique}/procedures/${dossier.demarche_number}/dossiers/${dossier.demarche_numerique_number}`}
      >Dossier sur Démarche Numérique</a
    >{:else}<p class="fr-text-mention--grey">
      Ce dossier provient de Démarches Numériques, mais son lien n'est pas disponible.
    </p>{/if}
{:else if dossier.source === "pitchou"}<p class="fr-text-mention--grey">
    Ce dossier a été créé directement dans Pitchou, sans dépôt sur Démarches Numériques.
  </p>{:else}<p class="fr-text-mention--grey">La source de ce dossier est inconnue.</p>{/if}
