<script lang="ts">
  import { deleteAvisExpert as deleteAvisExpertServer } from "./avisExpert.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import { readOnlyMode } from "./readOnly.ts";
  import { isOfficialAvisExpert } from "$lib/dossier/avisExpert.ts";

  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const readOnly = readOnlyMode();

  const idModalAddPieceJointeAvis = "modale-ajouter-piece-jointe-avis";

  // Read-only mode only exposes the official avis — the avis of the other
  // experts consulted by the instructeur stay internal.
  const visibleAvisExpert = $derived(
    readOnly.current
      ? dossier.avisExpert.filter(({ expert }) => isOfficialAvisExpert(expert))
      : dossier.avisExpert,
  );

  let sortedAvisExpert = $derived(
    [...visibleAvisExpert].sort((a, b) => {
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
          <AvisExpert dossierId={dossier.id} {avisExpert} {deleteAvisExpert} />
        {/each}
      </div>
    {:else}
      <p>
        <span class="fr-mb-3w">
          {readOnly.current
            ? "Aucun avis du CSRPN, du CNPN ou du ministre n'est associé à ce dossier."
            : "Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier."}
        </span>
      </p>
    {/if}
    {#if !readOnly.current}
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
    {/if}
  </div>

  <!-- The saisine protocol is guidance for the instructeur, not dossier data. -->
  {#if !readOnly.current}
    <aside
      class="fr-callout flex-[1_1_0] min-w-0 max-[62rem]:flex-[0_0_auto] max-[62rem]:self-stretch"
    >
      <h3 class="fr-callout__title">Vous devez saisir le CNPN ?</h3>
      <div class="fr-callout__text">
        <p class="fr-text--bold fr-mb-2w">Voici le protocole&nbsp;:</p>
        <ol class="flex flex-col gap-4 fr-m-0">
          <li>
            Vérifier que le dossier est prêt
            <span class="fr-hint-text block">
              (liste des espèces et de leurs impacts, dates de début des travaux, cartographie de
              l'emprise, etc.)
            </span>
          </li>
          <li>
            Préparer le mail&nbsp;:
            <ul class="fr-mt-1w fr-mb-0">
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
            <p class="fr-mt-1v fr-mx-0 fr-mb-0">
              <a
                class="fr-link [overflow-wrap:anywhere]"
                href="mailto:derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr"
                >derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr</a
              >
            </p>
          </li>
          <li>Stocker la saisine CNPN dans cet onglet</li>
          <li>Quand vous le recevrez, stocker l'avis CNPN dans cet onglet</li>
        </ol>
        <p class="fr-mt-3w fr-mb-0">
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
  {/if}
</div>

{#if !readOnly.current}
  <ModalAddPieceJointe id={idModalAddPieceJointeAvis} {dossier} source="ongletAvis" />
{/if}
