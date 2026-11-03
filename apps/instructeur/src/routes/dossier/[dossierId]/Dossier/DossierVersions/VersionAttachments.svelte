<script lang="ts">
  import type { DossierFull, FrontEndFichier } from "@pitchou/types/API_Pitchou.ts";
  let { dossier }: { dossier: DossierFull } = $props();
  const files = $derived.by(() => {
    const all = [
      dossier.especesImpactees.sourceFile,
      ...dossier.piecesJointesPetitionnaires,
      ...dossier.avisExpert.flatMap((avis) => [
        avis.avis_fichier_description,
        avis.saisine_fichier_description,
      ]),
      ...(dossier.decisionsAdministratives ?? []).map((decision) => decision.fichier_description),
      ...dossier.otherAttachments.map((attachment) => attachment.fichier_description),
    ].filter(
      (file): file is FrontEndFichier =>
        !!file &&
        /^\/(?:avis-expert\/fichier|decision-administrative\/fichier|piece-jointe-petitionnaire\/fichier|attachment-autre\/fichier|especes-impactees)\/[\da-f-]+$/iu.test(
          file.url,
        ),
    );
    return [...new Map(all.map((file) => [file.url, file])).values()];
  });
</script>

{#if files.length > 0}
  <div class="fr-mb-3w">
    <h3 class="fr-h6">Documents de cet état</h3>
    <ul>
      {#each files as file (file.url)}<li>
          <a href={file.url} target="_blank" rel="noopener noreferrer"
            >{file.name} <span class="fr-sr-only">(nouvelle fenêtre)</span></a
          >
        </li>{/each}
    </ul>
  </div>
{/if}
