<script lang="ts">
  import { deleteAvisExpert as deleteAvisExpertServer } from "./avisExpert.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";

  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const idModalAddPieceJointeAvis = "modale-ajouter-piece-jointe-avis";

  let sortedAvisExpert = $derived(
    [...dossier.avisExpert].sort((a, b) => {
      const dateA = new Date(a.avis_date ?? a.saisine_date ?? 0);
      const dateB = new Date(b.avis_date ?? b.saisine_date ?? 0);
      return differenceInDays(dateB, dateA);
    }),
  );

  async function deleteAvisExpert(avisExpert: FrontEndAvisExpert) {
    await deleteAvisExpertServer(avisExpert);
    await refreshDossierFull(dossier.id);
  }
</script>

<div class="avis-layout">
  <div class="section-list-avis-expert">
    <h2>Avis d'experts</h2>
    {#if sortedAvisExpert.length >= 1}
      <div class="list-avis-expert">
        {#each sortedAvisExpert as avisExpert}
          <AvisExpert dossierId={dossier.id} {avisExpert} {deleteAvisExpert} />
        {/each}
      </div>
    {:else}
      <p>
        <span class="fr-mb-3w"
          >Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.</span
        >
      </p>
    {/if}
    <button
      type="button"
      class="fr-btn fr-mt-3w {sortedAvisExpert.length === 0
        ? ''
        : 'fr-btn--secondary'} fr-btn--icon-left fr-icon-attachment-line"
      aria-controls={idModalAddPieceJointeAvis}
      data-fr-opened="false"
      onclick={() =>
        sendEvenement({
          type: "ouvrirModaleAjouterPieceJointe",
          détails: { dossierId: dossier.id, source: "ongletAvis" },
        })}
    >
      Ajouter un avis ou une saisine
    </button>
  </div>

  <aside class="protocole-cnpn fr-callout">
    <h3 class="fr-callout__title">Vous devez saisir le CNPN ?</h3>
    <div class="fr-callout__text">
      <p class="protocole-cnpn__intro">Voici le protocole&nbsp;:</p>
      <ol>
        <li>
          Vérifier que le dossier est prêt
          <span class="fr-hint-text protocole-cnpn__precision">
            (liste des espèces et de leurs impacts, dates de début des travaux, cartographie de
            l'emprise, etc.)
          </span>
        </li>
        <li>
          Préparer le mail&nbsp;:
          <ul>
            <li>
              Produire
              <a
                class="fr-link"
                href="https://betagouv.github.io/pitchou/instruction/document-types/bibliotheque/Mail%20Saisine%20CNPN.odt"
                target="_blank"
                rel="noopener external">le mail s'adressant au secrétariat du CNPN</a
              >
              grâce à la génération de document
            </li>
            <li>
              Produire la saisine du CNPN (votre propre document ou via la génération de document)
            </li>
          </ul>
        </li>
        <li>
          Envoyer le mail au secrétariat du CNPN (avec toutes les PJ et la demande d'accusé de
          réception)
          <p class="protocole-cnpn__lien">
            <a
              class="fr-link protocole-cnpn__email"
              href="mailto:derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr"
              >derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr</a
            >
          </p>
        </li>
        <li>Stocker la saisine CNPN dans cet onglet</li>
        <li>Quand vous le recevrez, stocker l'avis CNPN dans cet onglet</li>
      </ol>
      <p class="protocole-cnpn__details">
        <strong>Pour plus de détails&nbsp;: </strong>
        <a
          class="fr-link"
          href="https://betagouv.github.io/pitchou/instruction/saisine-cnpn.html"
          target="_blank"
          rel="noopener external">Consulter la documentation dédiée</a
        >
      </p>
    </div>
  </aside>
</div>

<ModalAddPieceJointe id={idModalAddPieceJointeAvis} {dossier} source="ongletAvis" />

<style lang="scss">
  .avis-layout {
    display: flex;
    align-items: flex-start;
    gap: 2rem;
  }

  .section-list-avis-expert {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 0;
  }

  .list-avis-expert {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .protocole-cnpn {
    flex: 1 1 0;
    min-width: 0;

    &__intro {
      font-weight: 700;
      margin-bottom: 1rem;
    }

    ol {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0;
    }

    ul {
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    /* Wrapper only: the link itself must stay inline, otherwise the DSFR
       underline (a background-image on the box) spans the whole width. */
    &__lien {
      margin: 0.25rem 0 0;
    }

    &__precision {
      display: block;
    }

    &__email {
      overflow-wrap: anywhere;
    }

    &__details {
      margin-top: 1.5rem;
      margin-bottom: 0;
    }
  }

  /* Not enough room left for two columns: stack the guidelines under the list */
  @media (max-width: 62rem) {
    .avis-layout {
      flex-direction: column;
    }

    .protocole-cnpn {
      flex: 0 0 auto;
      align-self: stretch;
    }
  }
</style>
