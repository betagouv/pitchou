<script lang="ts">
  import EspecesImpactTable from "./EspecesImpactTable.svelte";
  import "./review-layout.css";
  import { impactGroups } from "./impactGroups.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import FichierEspecesAlert from "./FichierEspecesAlert.svelte";
  import FieldChange from "./FieldChange.svelte";
  import { readOnlyMode } from "../readOnly.ts";
  import type { FieldChange as Change } from "@pitchou/types/notification.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

  type Props = {
    dossier: DossierFull;
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
    change?: Change;
    groupChanges?: Map<string | null, Change>;
  };

  let { dossier, anomalies, change, groupChanges = new Map() }: Props = $props();

  const readOnly = readOnlyMode();
  const impacts = $derived(dossier.especesImpactees.impacts);
  const sourceFile = $derived(dossier.especesImpactees.sourceFile);
  const groups = $derived(impactGroups(impacts, readOnly.current ? new Map() : groupChanges));

  async function makeFileContentBlob() {
    const especes = dossier.especesImpactees.sourceFile;
    if (!especes) {
      throw new Error("Aucun fichier espèces impactées à télécharger");
    }

    sendEvenement({
      type: "téléchargerListeÉspècesImpactées",
      details: { dossierId: dossier.id },
    });

    const response = await fetch(especes.url);
    return response.blob();
  }

  function makeFilename() {
    return dossier.especesImpactees.sourceFile?.name || "fichier";
  }
</script>

<div class="species-detail">
  {#if sourceFile || (!readOnly.current && change)}
    <div class="review-row dossier-review-row">
      <div class="file-info">
        {#if sourceFile}
          <FichierEspecesAlert {anomalies} {makeFileContentBlob} {makeFilename} />
        {/if}
        {#if !readOnly.current && change}
          <p class="fr-m-0">
            Le fichier des espèces a été modifié. Le groupe d'impact concerné n'est pas précisé.
          </p>
        {/if}
      </div>
      <div class="review-control"><FieldChange dossierId={dossier.id} {change} /></div>
    </div>
  {/if}
  {#each groups as group (group.id)}
    <section class="impact-group" data-impact-id={group.id ?? "unspecified"}>
      <h4 class="dossier-review-left">
        <span class="fr-icon-leaf-line" aria-hidden="true"></span>
        {group.label}
      </h4>
      <div class="review-row dossier-review-row">
        <EspecesImpactTable {group} pending={!!group.change} />
        <div class="review-control">
          <FieldChange dossierId={dossier.id} change={group.change} />
        </div>
      </div>
    </section>
  {:else}
    <p class="dossier-review-left">
      Aucune donnée sur les espèces impactées n'a été fournie par le pétitionnaire.
    </p>
  {/each}
</div>

<style>
  .species-detail {
    padding-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }
  .impact-group + .impact-group {
    margin-top: 2rem;
  }
  h4 {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 700;
    margin: 0 0 2rem;
    color: var(--text-title-grey, #161616);
  }
  h4 span {
    color: var(--text-mention-grey, #666);
    flex-shrink: 0;
  }
  .file-info {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .review-control {
    min-width: 0;
  }
  @media (max-width: 48rem) {
    .review-control {
      width: 100%;
    }
    .review-control:empty {
      display: none;
    }
  }
</style>
