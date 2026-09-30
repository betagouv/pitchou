<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { readOnlyMode } from "../readOnly.ts";
  import { piecesJointesAvis, type PieceJointeSimple } from "../piecesJointes.ts";
  import { deletePieceJointe } from "../deletePieceJointe.ts";
  import PieceJointeDeleteButton from "../PieceJointeDeleteButton.svelte";
  import type {
    DossierCnpnEmailSentEvent,
    DossierFull,
    FrontEndAvisExpert,
  } from "@pitchou/types/API_Pitchou.ts";

  let {
    dossierId,
    avisExpert,
    cnpnEmailEvent,
  }: {
    dossierId: DossierFull["id"];
    avisExpert: FrontEndAvisExpert;
    cnpnEmailEvent?: DossierCnpnEmailSentEvent;
  } = $props();
  const readOnly = readOnlyMode();
  let deletedKeys = $state<string[]>([]);
  function deletionKey(piece: PieceJointeSimple) {
    return `${piece.deletion?.type}/${piece.fileId}`;
  }
  const pieces = $derived(
    piecesJointesAvis({ avisExpert: [avisExpert] }).filter(
      (piece) => !deletedKeys.includes(deletionKey(piece)),
    ),
  );
  const saisineFile = $derived(pieces.find((piece) => piece.deletion?.type === "saisine"));
  const avisFile = $derived(pieces.find((piece) => piece.deletion?.type === "avis"));

  async function remove(piece: PieceJointeSimple) {
    if (readOnly.current) throw new Error("Vous ne pouvez pas supprimer cette pièce jointe.");
    await deletePieceJointe(dossierId, piece);
    deletedKeys = [...deletedKeys, deletionKey(piece)];
  }
</script>

<ul class="list-none fr-m-0 fr-p-0 border-t border-solid border-[color:var(--border-default-grey)]">
  {#if !readOnly.current}
    <li
      class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
    >
      <span
        class="fr-icon-file-text-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
        aria-hidden="true"
      ></span>
      <div class="min-w-0 flex-1">
        <span class="fr-hint-text block">Date d’ajout du courrier de saisine</span>
        <strong class="block"
          >{formatDateAbsolute(
            avisExpert.saisine_fichier_description?.created_at ?? avisExpert.saisine_date,
          )}</strong
        >
        {#if !saisineFile}<span class="fr-hint-text">Aucun fichier lié à ce dossier</span>{/if}
      </div>
      {#if saisineFile}
        <a
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-download-line flex-none"
          href={saisineFile.url}
          data-sveltekit-reload
          aria-label="Télécharger le fichier saisine">Télécharger</a
        >
        {#if saisineFile.fileId}
          <PieceJointeDeleteButton piece={saisineFile} onDelete={remove} />
        {/if}
      {/if}
    </li>
    {#if cnpnEmailEvent}
      <li
        class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
      >
        <span
          class="fr-icon-send-plane-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
          aria-hidden="true"
        ></span>
        <div class="min-w-0 flex-1">
          <span class="fr-hint-text block">Date d’envoi du mail via Pitchou</span>
          <strong class="block">{formatDateAbsolute(cnpnEmailEvent.sent_at)}</strong>
        </div>
      </li>
      <li
        class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
      >
        <span
          class="fr-icon-eye-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
          aria-hidden="true"
        ></span>
        <div class="min-w-0 flex-1">
          <span class="fr-hint-text block">Date de lecture de la saisine</span>
          <strong class="block"
            >{cnpnEmailEvent.opened_at
              ? formatDateAbsolute(cnpnEmailEvent.opened_at)
              : "Pas encore lue"}</strong
          >
        </div>
      </li>
    {/if}
  {/if}
  {#if avisFile || avisExpert.avis_date || avisExpert.avis === "Avis favorable tacite"}
    <li
      class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
    >
      <span
        class="fr-icon-checkbox-circle-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
        aria-hidden="true"
      ></span>
      <div class="min-w-0 flex-1">
        <span class="fr-hint-text block">Date de l’avis</span>
        <strong class="block">{formatDateAbsolute(avisExpert.avis_date)}</strong>
        {#if !avisFile}<span class="fr-hint-text"
            >{avisExpert.avis === "Avis favorable tacite"
              ? "Avis favorable tacite"
              : "Aucun fichier lié à ce dossier"}</span
          >{/if}
      </div>
      {#if avisFile}
        <a
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-download-line flex-none"
          href={avisFile.url}
          data-sveltekit-reload
          aria-label="Télécharger le fichier de l'avis">Télécharger</a
        >
        {#if !readOnly.current && avisFile.fileId}
          <PieceJointeDeleteButton piece={avisFile} onDelete={remove} />
        {/if}
      {/if}
    </li>
  {/if}
</ul>
