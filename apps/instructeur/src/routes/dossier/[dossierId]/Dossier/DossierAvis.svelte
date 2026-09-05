<script lang="ts">
  import { deleteAvisExpert as deleteAvisExpertServer } from "./avisExpert.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import Pictogramme from "$lib/components/DSFR/Pictogramme.svelte";
  import CnpnEmailModal from "./CnpnEmailModal.svelte";

  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    followers: string[];
  };

  let { dossier, email, followers }: Props = $props();
  let cnpnEmailModalOpen = $state(false);

  function openCnpnEmailModal() {
    cnpnEmailModalOpen = true;
  }

  function preloadCnpnEmailEditor() {
    void import("$lib/components/EmailRichTextEditor.svelte");
  }

  function cnpnEmailEventFor(avisExpert: FrontEndAvisExpert) {
    const saisineFileId = avisExpert.saisine_fichier_description?.id;
    if (avisExpert.expert?.trim().toUpperCase() !== "CNPN" || !saisineFileId) return undefined;
    return dossier.cnpnEmailSentEvents?.find((event) =>
      event.attachment_ids.includes(saisineFileId),
    );
  }

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

<div class="flex items-start gap-8 max-[62rem]:flex-col">
  <div class="flex flex-col flex-[1_1_0] min-w-0">
    <h2>Avis d'experts</h2>
    {#if sortedAvisExpert.length >= 1}
      <div class="flex flex-col gap-6">
        {#each sortedAvisExpert as avisExpert}
          <AvisExpert
            dossierId={dossier.id}
            {avisExpert}
            cnpnEmailEvent={cnpnEmailEventFor(avisExpert)}
            {deleteAvisExpert}
          />
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
          details: { dossierId: dossier.id, source: "ongletAvis" },
        })}
    >
      Ajouter un avis ou une saisine
    </button>
  </div>

  <aside
    class="fr-callout flex-[1_1_0] min-w-0 max-[62rem]:flex-[0_0_auto] max-[62rem]:self-stretch"
  >
    <h3 class="fr-callout__title">Vous devez saisir le CNPN ?</h3>
    <div class="fr-callout__text">
      <p class="fr-text--bold fr-mb-2w">Voici le protocole&nbsp;:</p>
      <ol class="flex flex-col gap-4 fr-m-0">
        <li>
          <strong>Vérifier que le dossier est prêt</strong>
          <span class="fr-hint-text block">
            (liste des espèces et de leurs impacts, dates de début des travaux, cartographie de
            l'emprise, etc.)
          </span>
        </li>
        <li>
          <strong>Ajouter votre saisine dans Pitchou</strong>
          <ul class="fr-mt-1w fr-mb-0 flex flex-col gap-2">
            <li>La rédiger ou utiliser la génération de document</li>
            <li>La stocker dans cet onglet</li>
          </ul>
        </li>
        <li>
          <strong>Envoyer le mail</strong>
          <ul class="fr-mt-1w fr-mb-2w flex flex-col gap-2">
            <li>Cliquer sur l'adresse mail du secrétariat CNPN pour initier la création du mail</li>
            <li>Sélectionner les PJ, dont la saisine, qui seront intégrées au mail</li>
            <li>Vérifier, compléter si besoin et envoyer</li>
          </ul>
          <button
            type="button"
            class="fr-link flex w-full items-center gap-3 rounded border border-solid border-[color:var(--border-action-high-blue-france)] fr-p-1w text-left [overflow-wrap:anywhere] hover:bg-[var(--background-contrast-grey)]"
            aria-haspopup="dialog"
            onclick={openCnpnEmailModal}
            onpointerenter={preloadCnpnEmailEditor}
            onfocus={preloadCnpnEmailEditor}
          >
            <Pictogramme name="mail-send" size={48} />
            <span> derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr </span>
          </button>
        </li>
        <li>
          <strong>Quand vous le recevrez par mail, stocker l'avis CNPN dans cet onglet</strong>
        </li>
      </ol>
    </div>
  </aside>
</div>

<ModalAddPieceJointe id={idModalAddPieceJointeAvis} {dossier} source="ongletAvis" />

{#if cnpnEmailModalOpen}
  <CnpnEmailModal {dossier} {email} {followers} onClose={() => (cnpnEmailModalOpen = false)} />
{/if}
