<script lang="ts">
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import ProjectField from "./ProjectField.svelte";
  import type { FieldChange as Change } from "@pitchou/types/notification.ts";

  type Props = { dossier: DossierFull; changes?: Change[] };
  let { dossier, changes = [] }: Props = $props();
  const removedChanges = $derived(
    changes.filter(
      (change) =>
        !dossier.piecesJointesPetitionnaires.some((file) => change.field === `piece:${file.id}`),
    ),
  );

  function truncate(name: string | null, max = 43) {
    if (!name) return "(fichier sans nom)";
    if (name.length <= max) return name;
    const dot = name.lastIndexOf(".");
    const extension = name.substring(dot);
    return `${name.substring(0, max - extension.length - 3)}(…)${extension}`;
  }
</script>

{#if dossier.piecesJointesPetitionnaires.length === 0}
  <p class="dossier-review-left">
    Aucune pièce jointe n'a été déposée par le pétitionnaire dans le formulaire.
  </p>
{:else}
  <ul class="list-none fr-p-0">
    {#each dossier.piecesJointesPetitionnaires as file}
      {@const change = changes.find((change) => change.field === `piece:${file.id}`)}
      <li class="mb-[0.3rem]">
        <ProjectField dossierId={dossier.id} label="" value={file.name} {change}>
          <a
            class="fr-link fr-link--download"
            href={file.url}
            title={file.name}
            data-sveltekit-reload
            >{truncate(file.name)}<span class="fr-link__detail"
              >{file.media_type} - {byteFormat.format(file.size)}{file.demarche_numerique_created_at
                ? ` - Date de dépôt : ${formatDateAbsolute(file.demarche_numerique_created_at)}`
                : ""}</span
            ></a
          >
        </ProjectField>
      </li>{/each}
  </ul>
{/if}
{#each removedChanges as change (change.field)}
  <ProjectField
    dossierId={dossier.id}
    label={change.label}
    value={change.field.startsWith("piece:historique:")
      ? "Modification de pièce jointe enregistrée dans l'historique. Le fichier d'origine n'est pas identifié."
      : "Pièce retirée"}
    {change}
  />
{/each}
