<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";

  import type {
    DossierFull,
    FrontEndAvisExpert,
    FrontEndFichier,
  } from "@pitchou/types/API_Pitchou.ts";

  type LinkedTab = "instruction" | "projet" | "avis" | "controles";

  type Props = {
    dossier: DossierFull;
    openTab: (tab: LinkedTab) => void;
  };

  let { dossier, openTab }: Props = $props();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-pieces-jointes";

  type PieceJointeSimple = {
    label: string;
    description?: FrontEndFichier;
    date?: Date | string | null;
    labelDate: string;
    url: string;
  };

  function labelAvisExpert(avisExpert: FrontEndAvisExpert) {
    return avisExpert.expert ?? "Expert";
  }

  function nomPieceJointe(pieceJointe: PieceJointeSimple) {
    return pieceJointe.description?.name || pieceJointe.label;
  }

  function detailsPieceJointe(pieceJointe: PieceJointeSimple) {
    const details = [];
    const { description } = pieceJointe;

    if (description?.media_type) {
      details.push(description.media_type);
    }

    if (typeof description?.size === "number") {
      details.push(byteFormat.format(description.size));
    }

    if (pieceJointe.date) {
      details.push(`${pieceJointe.labelDate} : ${formatDateAbsolute(pieceJointe.date)}`);
    }

    return details.join(" - ");
  }

  function detailsPieceJointeWithContext(pieceJointe: PieceJointeSimple) {
    const details = detailsPieceJointe(pieceJointe);

    return details ? `${pieceJointe.label} - ${details}` : pieceJointe.label;
  }

  const piecesJointesAvis: PieceJointeSimple[] = $derived(
    dossier.avisExpert.flatMap((avisExpert) => {
      const pieces: PieceJointeSimple[] = [];
      const expert = labelAvisExpert(avisExpert);

      if (avisExpert.saisine_fichier_url) {
        pieces.push({
          label: `Saisine - ${expert}`,
          description: avisExpert.saisine_fichier_description,
          date: avisExpert.saisine_date,
          labelDate: "Date de saisine",
          url: avisExpert.saisine_fichier_url,
        });
      }

      if (avisExpert.avis_fichier_url) {
        pieces.push({
          label: `Avis - ${expert}`,
          description: avisExpert.avis_fichier_description,
          date: avisExpert.avis_date,
          labelDate: "Date de l'avis",
          url: avisExpert.avis_fichier_url,
        });
      }

      return pieces;
    }),
  );

  const piecesJointesArretes: PieceJointeSimple[] = $derived(
    (dossier.decisionsAdministratives ?? []).flatMap((decision) => {
      if (!decision.fichier_url) {
        return [];
      }

      return [
        {
          label: `${decision.type || "Décision administrative"}${decision.number ? ` ${decision.number}` : ""}`,
          description: decision.fichier_description,
          date: decision.signature_date,
          labelDate: "Date de signature",
          url: decision.fichier_url,
        },
      ];
    }),
  );

  const piecesJointesAutres: PieceJointeSimple[] = $derived(
    dossier.otherAttachments.map((attachment) => ({
      label: attachment.type,
      description: attachment.fichier_description,
      date: attachment.attachment_date,
      labelDate: "Date de la pièce jointe",
      url: attachment.fichier_url ?? "",
    })),
  );
</script>

<section class="flex flex-col gap-5">
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-attachment-line self-start"
    aria-controls={idModalAddPieceJointe}
    data-fr-opened="false"
    onclick={() =>
      sendEvenement({
        type: "ouvrirModaleAjouterPieceJointe",
        details: { dossierId: dossier.id, source: "ongletPiecesJointes" },
      })}
  >
    Ajouter une pièce jointe
  </button>

  <section class="fr-p-0 [&_p:last-child]:mb-0">
    <div
      class="flex items-start justify-between gap-4 fr-mb-3v max-[48rem]:flex-col max-[48rem]:gap-1 [&_h3]:m-0"
    >
      <h3>Projet</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("projet")}
      >
        Voir dans l'onglet Projet
      </button>
    </div>
    {#if dossier.piecesJointesPetitionnaires.length === 0}
      <p>Aucune pièce jointe n'a été déposée par le pétitionnaire.</p>
    {:else}
      <ul class="flex flex-col gap-2 list-none fr-p-0 fr-m-0">
        {#each dossier.piecesJointesPetitionnaires as { url, demarche_numerique_created_at, name, media_type, size }}
          <li
            class="flex items-start justify-between gap-3 fr-py-3v fr-px-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)] max-[48rem]:flex-col"
          >
            <div class="min-w-0">
              <a class="fr-link fr-link--download" href={url} title={name} data-sveltekit-reload>
                {name || "(fichier sans nom)"}
                <span class="fr-link__detail">
                  {media_type} - {byteFormat.format(size)}{demarche_numerique_created_at
                    ? ` - Date de dépôt : ${formatDateAbsolute(demarche_numerique_created_at)}`
                    : ""}
                </span>
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="fr-p-0 [&_p:last-child]:mb-0">
    <div
      class="flex items-start justify-between gap-4 fr-mb-3v max-[48rem]:flex-col max-[48rem]:gap-1 [&_h3]:m-0"
    >
      <h3>Avis d'experts</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("avis")}
      >
        Voir dans l'onglet Avis
      </button>
    </div>
    {#if piecesJointesAvis.length === 0}
      <p>Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.</p>
    {:else}
      <ul class="flex flex-col gap-2 list-none fr-p-0 fr-m-0">
        {#each piecesJointesAvis as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li
            class="flex items-start justify-between gap-3 fr-py-3v fr-px-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)] max-[48rem]:flex-col"
          >
            <div class="min-w-0">
              <a
                class="fr-link fr-link--download"
                href={pieceJointe.url}
                title={nomPieceJointe(pieceJointe)}
                data-sveltekit-reload
              >
                {nomPieceJointe(pieceJointe)}
                {#if details}
                  <span class="fr-link__detail">{details}</span>
                {/if}
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="fr-p-0 [&_p:last-child]:mb-0">
    <div
      class="flex items-start justify-between gap-4 fr-mb-3v max-[48rem]:flex-col max-[48rem]:gap-1 [&_h3]:m-0"
    >
      <h3>Décisions administratives</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("controles")}
      >
        Voir dans l'onglet Contrôles
      </button>
    </div>
    {#if piecesJointesArretes.length === 0}
      <p>Aucun fichier d'arrêté ou de décision administrative n'est associé à ce dossier.</p>
    {:else}
      <ul class="flex flex-col gap-2 list-none fr-p-0 fr-m-0">
        {#each piecesJointesArretes as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li
            class="flex items-start justify-between gap-3 fr-py-3v fr-px-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)] max-[48rem]:flex-col"
          >
            <div class="min-w-0">
              <a
                class="fr-link fr-link--download"
                href={pieceJointe.url}
                title={nomPieceJointe(pieceJointe)}
                data-sveltekit-reload
              >
                {nomPieceJointe(pieceJointe)}
                {#if details}
                  <span class="fr-link__detail">{details}</span>
                {/if}
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="fr-p-0 [&_p:last-child]:mb-0">
    <div
      class="flex items-start justify-between gap-4 fr-mb-3v max-[48rem]:flex-col max-[48rem]:gap-1 [&_h3]:m-0"
    >
      <h3>Autres</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("instruction")}
      >
        Voir dans l'onglet Instruction
      </button>
    </div>
    {#if piecesJointesAutres.length === 0}
      <p>Aucune autre pièce jointe n'est associée à ce dossier.</p>
    {:else}
      <ul class="flex flex-col gap-2 list-none fr-p-0 fr-m-0">
        {#each piecesJointesAutres as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li
            class="flex items-start justify-between gap-3 fr-py-3v fr-px-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)] max-[48rem]:flex-col"
          >
            <div class="min-w-0">
              <a
                class="fr-link fr-link--download"
                href={pieceJointe.url}
                title={nomPieceJointe(pieceJointe)}
                data-sveltekit-reload
              >
                {nomPieceJointe(pieceJointe)}
                {#if details}
                  <span class="fr-link__detail">{details}</span>
                {/if}
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</section>

<ModalAddPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="ongletPiecesJointes"
/>
