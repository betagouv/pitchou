<script lang="ts">
  import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
  import type { OnagreConsultation } from "@pitchou/types/apiPitchou/dossierDetails.ts";
  import AvisExpert from "./AvisExpert.svelte";

  let {
    consultations,
    expertOpinions,
    attachments,
    dossierId,
    deleteAvisExpert,
  }: {
    consultations: OnagreConsultation[];
    expertOpinions: FrontEndAvisExpert[];
    attachments: DossierFull["otherAttachments"];
    dossierId: DossierFull["id"];
    deleteAvisExpert: (avis: FrontEndAvisExpert) => Promise<unknown>;
  } = $props();
  const sections = [
    { kind: "saisine", label: "Saisines issues d’Onagre" },
    { kind: "regulatory", label: "Avis réglementaires issus d’Onagre" },
    { kind: "optional", label: "Autres experts consultés dans Onagre" },
  ] as const;
  const opinions = $derived(new Map(expertOpinions.map((opinion) => [opinion.id, opinion])));
  const files = $derived(new Map(attachments.map((file) => [file.fichier, file.fichier_url])));
  const groups = $derived(Map.groupBy(consultations, ({ kind }) => kind));
</script>

{#each sections as { kind, label } (kind)}
  {@const items = groups.get(kind) ?? []}
  {#if items.length}
    <section class="fr-mb-3w">
      <h3 class="fr-h5">{label}</h3>
      <ul class="flex flex-col gap-4 list-none fr-m-0 fr-p-0">
        {#each items as entry (entry.key)}
          {@const opinion = entry.avisExpertId ? opinions.get(entry.avisExpertId) : undefined}
          <li class="fr-p-2w border border-[color:var(--border-default-grey)]">
            {#if opinion}
              <AvisExpert {dossierId} avisExpert={opinion} {deleteAvisExpert} imported />
            {:else}
              <h4 class="fr-text--bold fr-mb-1w">
                {entry.organisation ?? "Organisme non renseigné"}
                {#if kind !== "saisine"}
                  · {entry.outcome ?? "Avis non renseigné"}{/if}
              </h4>
            {/if}
            {#if entry.saisineDate}
              <p class="fr-mb-0">Date de saisine · {formatDateAbsolute(entry.saisineDate)}</p>
            {/if}
            {#if !opinion && entry.responseDate}
              <p class="fr-mb-0">Date de l’avis · {formatDateAbsolute(entry.responseDate)}</p>
            {/if}
            {#if entry.relatedResponseDate}
              <p class="fr-mb-0">Avis associé · {formatDateAbsolute(entry.relatedResponseDate)}</p>
            {/if}
            {#if entry.relatedSaisineDate}
              <p class="fr-mb-0">
                Saisine associée · {formatDateAbsolute(entry.relatedSaisineDate)}
              </p>
            {/if}
            {#if entry.comment}
              <p class="fr-mb-0 whitespace-pre-wrap">{entry.comment}</p>
            {/if}
            {#each entry.files as file}
              {@const url = file.fileId ? files.get(file.fileId) : undefined}
              <p class="fr-mb-0">
                {#if url}<a href={url} data-sveltekit-reload>{file.name}</a>
                {:else}{file.name} · fichier indisponible{/if}
              </p>
            {/each}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/each}
