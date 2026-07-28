<script lang="ts">
  import {
    uploadPieceJointe,
    deletePieceJointe,
    uploadEspecesImpactees,
    type AdminDossierDetail,
  } from "$lib/actions/adminDossiers.ts";

  type Props = {
    detail: AdminDossierDetail;
    onChanged: () => Promise<void>;
  };

  let { detail, onChanged }: Props = $props();

  let busy = $state(false);
  let fileError = $state<string | null>(null);
  let pieceJointeInput = $state<HTMLInputElement | undefined>();
  let especesInput = $state<HTMLInputElement | undefined>();

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  async function run(action: () => Promise<void>) {
    busy = true;
    fileError = null;
    try {
      await action();
      await onChanged();
    } catch (e) {
      fileError = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  function onPieceJointeSelected() {
    const file = pieceJointeInput?.files?.[0];
    if (!file) return;
    run(async () => {
      await uploadPieceJointe(detail.dossier.id, file);
      if (pieceJointeInput) pieceJointeInput.value = "";
    });
  }

  function onEspecesSelected() {
    const file = especesInput?.files?.[0];
    if (!file) return;
    run(async () => {
      await uploadEspecesImpactees(detail.dossier.id, file);
      if (especesInput) especesInput.value = "";
    });
  }
</script>

<section class="fr-mt-6w fr-pt-3w border-t border-[color:var(--border-default-grey)]">
  <h2 class="fr-h4">Pièces jointes</h2>

  {#if fileError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <p>{fileError}</p>
    </div>
  {/if}

  {#if detail.piecesJointes.length >= 1}
    <div class="fr-table fr-table--bordered">
      <table>
        <thead>
          <tr>
            <th scope="col">Fichier</th>
            <th scope="col">Ajouté le</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each detail.piecesJointes as pieceJointe (pieceJointe.id)}
            <tr>
              <td>{pieceJointe.name}</td>
              <td>
                {formatDate(pieceJointe.demarche_numerique_created_at ?? pieceJointe.created_at)}
              </td>
              <td>
                <button
                  type="button"
                  class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
                  disabled={busy}
                  onclick={() => run(() => deletePieceJointe(detail.dossier.id, pieceJointe.id))}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p>Aucune pièce jointe.</p>
  {/if}

  <div class="fr-upload-group fr-mb-3w">
    <label class="fr-label" for="upload-piece-jointe">
      Ajouter une pièce jointe
      <span class="fr-hint-text"
        >Le fichier apparaîtra dans l'onglet Pièces jointes du dossier.</span
      >
    </label>
    <input
      class="fr-upload"
      id="upload-piece-jointe"
      type="file"
      disabled={busy}
      bind:this={pieceJointeInput}
      onchange={onPieceJointeSelected}
    />
  </div>

  <h2 class="fr-h4">Espèces impactées</h2>
  {#if detail.especesImpactees}
    <p>Fichier actuel : {detail.especesImpactees.name}</p>
  {:else}
    <p>Aucun fichier d'espèces impactées.</p>
  {/if}
  <div class="fr-upload-group">
    <label class="fr-label" for="upload-especes-impactees">
      {detail.especesImpactees ? "Remplacer le fichier" : "Ajouter le fichier"}
      <span class="fr-hint-text">
        Fichier issu de l'outil de saisie des espèces (.ods) — il remplace l'actuel.
      </span>
    </label>
    <input
      class="fr-upload"
      id="upload-especes-impactees"
      type="file"
      disabled={busy}
      bind:this={especesInput}
      onchange={onEspecesSelected}
    />
  </div>
</section>
