<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import ModaleAjouterPieceJointe from "./ModaleAjouterPieceJointe.svelte";

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
    return pieceJointe.description?.nom || pieceJointe.label;
  }

  function detailsPieceJointe(pieceJointe: PieceJointeSimple) {
    const details = [];
    const { description } = pieceJointe;

    if (description?.media_type) {
      details.push(description.media_type);
    }

    if (typeof description?.taille === "number") {
      details.push(byteFormat.format(description.taille));
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
          date: avisExpert.date_saisine,
          labelDate: "Date de saisine",
          url: avisExpert.saisine_fichier_url,
        });
      }

      if (avisExpert.avis_fichier_url) {
        pieces.push({
          label: `Avis - ${expert}`,
          description: avisExpert.avis_fichier_description,
          date: avisExpert.date_avis,
          labelDate: "Date de l'avis",
          url: avisExpert.avis_fichier_url,
        });
      }

      return pieces;
    }),
  );

  const piecesJointesArretes: PieceJointeSimple[] = $derived(
    (dossier.décisionsAdministratives ?? []).flatMap((decision) => {
      if (!decision.fichier_url) {
        return [];
      }

      return [
        {
          label: `${decision.type || "Décision administrative"}${decision.numéro ? ` ${decision.numéro}` : ""}`,
          description: decision.fichier_description,
          date: decision.date_signature,
          labelDate: "Date de signature",
          url: decision.fichier_url,
        },
      ];
    }),
  );

  const piecesJointesAutres: PieceJointeSimple[] = $derived(
    dossier.attachmentAutres.map((attachment) => ({
      label: attachment.type,
      description: attachment.fichier_description,
      date: attachment.attachment_date,
      labelDate: "Date de la pièce jointe",
      url: attachment.fichier_url ?? "",
    })),
  );
</script>

<section class="pieces-jointes">
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-attachment-line button-add-piece-jointe"
    aria-controls={idModalAddPieceJointe}
    data-fr-opened="false"
    onclick={() =>
      sendEvenement({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: dossier.id, source: "ongletPiecesJointes" },
      })}
  >
    Ajouter une pièce jointe
  </button>

  <section class="section-pieces-jointes">
    <div class="header-section-pieces-jointes">
      <h3>Projet</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("projet")}
      >
        Voir dans l'onglet Projet
      </button>
    </div>
    {#if dossier.piècesJointesPétitionnaires.length === 0}
      <p>Aucune pièce jointe n'a été déposée par le pétitionnaire.</p>
    {:else}
      <ul class="list-cards-pieces-jointes">
        {#each dossier.piècesJointesPétitionnaires as { url, DS_createdAt, nom, media_type, taille }}
          <li class="card-piece-jointe">
            <div class="piece-jointe-fichier">
              <a class="fr-link fr-link--download" href={url} title={nom} data-sveltekit-reload>
                {nom || "(fichier sans nom)"}
                <span class="fr-link__detail">
                  {media_type} - {byteFormat.format(taille)}{DS_createdAt
                    ? ` - Date de dépôt : ${formatDateAbsolute(DS_createdAt)}`
                    : ""}
                </span>
              </a>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section-pieces-jointes">
    <div class="header-section-pieces-jointes">
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
      <ul class="list-cards-pieces-jointes">
        {#each piecesJointesAvis as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li class="card-piece-jointe">
            <div class="piece-jointe-fichier">
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

  <section class="section-pieces-jointes">
    <div class="header-section-pieces-jointes">
      <h3>Décisions administratives</h3>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        onclick={() => openTab("controles")}
      >
        Voir dans l'onglet Controles
      </button>
    </div>
    {#if piecesJointesArretes.length === 0}
      <p>Aucun fichier d'arrêté ou de décision administrative n'est associé à ce dossier.</p>
    {:else}
      <ul class="list-cards-pieces-jointes">
        {#each piecesJointesArretes as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li class="card-piece-jointe">
            <div class="piece-jointe-fichier">
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

  <section class="section-pieces-jointes">
    <div class="header-section-pieces-jointes">
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
      <ul class="list-cards-pieces-jointes">
        {#each piecesJointesAutres as pieceJointe}
          {@const details = detailsPieceJointeWithContext(pieceJointe)}
          <li class="card-piece-jointe">
            <div class="piece-jointe-fichier">
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

<ModaleAjouterPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="ongletPiecesJointes"
/>

<style lang="scss">
  .pieces-jointes {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .button-add-piece-jointe {
    align-self: flex-start;
  }

  .section-pieces-jointes {
    padding: 0;

    p:last-child {
      margin-bottom: 0;
    }
  }

  .header-section-pieces-jointes {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;

    h3 {
      margin: 0;
    }
  }

  .list-cards-pieces-jointes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .card-piece-jointe {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background-color: var(--background-alt-grey, #f6f6f6);
  }

  .piece-jointe-fichier {
    min-width: 0;
  }

  @media (max-width: 48rem) {
    .header-section-pieces-jointes {
      flex-direction: column;
      gap: 0.25rem;
    }

    .card-piece-jointe {
      flex-direction: column;
    }
  }
</style>
