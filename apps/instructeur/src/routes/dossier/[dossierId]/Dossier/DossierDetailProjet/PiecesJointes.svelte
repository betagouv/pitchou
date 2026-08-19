<script lang="ts">
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = { dossier: DossierFull };
  let { dossier }: Props = $props();

  function truncate(name: string | null, max = 43) {
    if (!name) return "(fichier sans nom)";
    if (name.length <= max) return name;
    const dot = name.lastIndexOf(".");
    const extension = name.substring(dot);
    return `${name.substring(0, max - extension.length - 3)}(…)${extension}`;
  }
</script>

{#if dossier.piecesJointesPetitionnaires.length === 0}
  <p>Aucune pièce jointe n'a été déposée par le pétitionnaire dans le formulaire.</p>
{:else}
  <ul class="list-none fr-p-0">
    {#each dossier.piecesJointesPetitionnaires as file}<li class="mb-[0.3rem]">
        <a class="fr-link fr-link--download" href={file.url} title={file.name} data-sveltekit-reload
          >{truncate(file.name)}<span class="fr-link__detail"
            >{file.media_type} - {byteFormat.format(file.size)}{file.demarche_numerique_created_at
              ? ` - Date de dépôt : ${formatDateAbsolute(file.demarche_numerique_created_at)}`
              : ""}</span
          ></a
        >
      </li>{/each}
  </ul>
{/if}
