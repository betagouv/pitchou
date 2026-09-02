<script lang="ts">
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import PieceJointeSection from "./PieceJointeSection.svelte";
  import {
    piecesJointesAutres,
    piecesJointesAvis,
    piecesJointesDecisions,
    piecesJointesProjet,
  } from "./piecesJointes.ts";
  import { readOnlyMode } from "./readOnly.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type LinkedTab = "instruction" | "detail-du-projet" | "avis" | "controles";

  type Props = {
    dossier: DossierFull;
    openTab: (tab: LinkedTab) => void;
  };

  let { dossier, openTab }: Props = $props();

  const readOnly = readOnlyMode();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-pieces-jointes";

  const piecesProjet = $derived(piecesJointesProjet(dossier));
  const piecesAvis = $derived(piecesJointesAvis(dossier, readOnly.current));
  const piecesArretes = $derived(piecesJointesDecisions(dossier));
  const piecesAutres = $derived(piecesJointesAutres(dossier));
</script>

<section class="flex flex-col gap-5">
  {#if !readOnly.current}
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
  {/if}

  <PieceJointeSection
    title="Projet"
    emptyMessage="Aucune pièce jointe n'a été déposée par le pétitionnaire."
    tabLabel="Détail du projet"
    pieces={piecesProjet}
    openTab={() => openTab("detail-du-projet")}
  />
  <PieceJointeSection
    title="Avis d'experts"
    emptyMessage={readOnly.current
      ? "Aucun avis du CSRPN, du CNPN ou du ministre n'est associé à ce dossier."
      : "Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier."}
    tabLabel="Avis"
    pieces={piecesAvis}
    openTab={() => openTab("avis")}
  />
  <PieceJointeSection
    title="Décisions administratives"
    emptyMessage="Aucun fichier d'arrêté ou de décision administrative n'est associé à ce dossier."
    tabLabel="Contrôles"
    pieces={piecesArretes}
    openTab={() => openTab("controles")}
  />
  <!-- The attachments added by the instructeur stay internal to the service. -->
  {#if !readOnly.current}
    <PieceJointeSection
      title="Autres"
      emptyMessage="Aucune autre pièce jointe n'est associée à ce dossier."
      tabLabel="Instruction"
      pieces={piecesAutres}
      openTab={() => openTab("instruction")}
    />
  {/if}
</section>

{#if !readOnly.current}
  <ModalAddPieceJointe
    id={idModalAddPieceJointe}
    {dossier}
    typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
    source="ongletPiecesJointes"
  />
{/if}
