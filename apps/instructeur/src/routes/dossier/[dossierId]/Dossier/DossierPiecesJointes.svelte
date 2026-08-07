<script lang="ts">
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";
  import PieceJointeSection from "./PieceJointeSection.svelte";
  import type { PieceJointeSimple } from "./PieceJointeSection.svelte";

  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type LinkedTab = "instruction" | "projet" | "avis" | "controles";

  type Props = {
    dossier: DossierFull;
    openTab: (tab: LinkedTab) => void;
  };

  let { dossier, openTab }: Props = $props();

  const idModalAddPieceJointe = "modale-ajouter-piece-jointe-pieces-jointes";

  function labelAvisExpert(avisExpert: FrontEndAvisExpert) {
    return avisExpert.expert ?? "Expert";
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
  const piecesJointesProjet: PieceJointeSimple[] = $derived(
    dossier.piecesJointesPetitionnaires.map(
      ({ url, demarche_numerique_created_at, name, media_type, size }) => ({
        label: name || "(fichier sans nom)",
        description: { name, media_type, size, url },
        date: demarche_numerique_created_at,
        labelDate: "Date de dépôt",
        url,
      }),
    ),
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

  <PieceJointeSection
    title="Projet"
    emptyMessage="Aucune pièce jointe n'a été déposée par le pétitionnaire."
    tabLabel="Projet"
    pieces={piecesJointesProjet}
    openTab={() => openTab("projet")}
  />
  <PieceJointeSection
    title="Avis d'experts"
    emptyMessage="Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier."
    tabLabel="Avis"
    pieces={piecesJointesAvis}
    openTab={() => openTab("avis")}
  />
  <PieceJointeSection
    title="Décisions administratives"
    emptyMessage="Aucun fichier d'arrêté ou de décision administrative n'est associé à ce dossier."
    tabLabel="Contrôles"
    pieces={piecesJointesArretes}
    openTab={() => openTab("controles")}
  />
  <PieceJointeSection
    title="Autres"
    emptyMessage="Aucune autre pièce jointe n'est associée à ce dossier."
    tabLabel="Instruction"
    pieces={piecesJointesAutres}
    openTab={() => openTab("instruction")}
  />
</section>

<ModalAddPieceJointe
  id={idModalAddPieceJointe}
  {dossier}
  typesPiecesJointes={["Saisine expert", "Avis expert", "Décision administrative", "Autre"]}
  source="ongletPiecesJointes"
/>
