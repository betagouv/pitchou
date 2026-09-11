<script lang="ts">
  import { tick } from "svelte";
  import { setDossierFull, store } from "$lib/state/store.svelte.ts";
  import { recordLocalWrite } from "$lib/dossier/dossier.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { authorInitials, authorName, avatarClass } from "./commentaires.ts";
  import CommentaireActions from "./CommentaireActions.svelte";
  import CommentaireEditor from "./CommentaireEditor.svelte";
  import NouveauCommentaireForm from "./NouveauCommentaireForm.svelte";
  import { readOnlyMode } from "../readOnly.ts";
  import type { DossierCommentaire } from "@pitchou/types/capabilities.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  let { dossier, email }: { dossier: DossierFull; email: string } = $props();
  const readOnly = readOnlyMode();
  let commentaires: DossierCommentaire[] = $state([]);
  // Preserve the initial thread before allowing writes; later lists are invalidated on save.
  let loaded = $state(false);
  let invalidateList: (() => void) | undefined;
  let newContent = $state("");
  let submitting = $state(false);
  let savingEdit = $state(false);
  let editingId: string | null = $state(null);
  let editContent = $state("");
  let errorMessage = $state("");
  let newCommentInput: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    let active = true;
    invalidateList = () => {
      active = false;
    };
    void store.capabilities
      .listerCommentaires?.(dossier.id)
      .then((list) => {
        if (!active) return;
        commentaires = list;
        loaded = true;
      })
      .catch(() => {
        if (active) errorMessage = "Les commentaires n'ont pas pu être chargés.";
      });
    return invalidateList;
  });

  function dateLabel({ author_email, created_at, updated_at }: DossierCommentaire): string {
    // The migrated free comment predates the comment feature.
    if (!author_email) return "avant 09/2026";
    const written = `Le ${formatDateAbsolute(new Date(created_at), "dd/MM/yyyy")}`;
    return updated_at
      ? `${written} · modifié le ${formatDateAbsolute(new Date(updated_at), "dd/MM/yyyy")}`
      : written;
  }

  // Keep the cached dossier's latest comment in sync with the thread.
  function syncLatestCommentaire() {
    invalidateList?.();
    const latest = commentaires[0]?.content ?? null;
    const cachedDossier = store.fullDossiers.get(dossier.id) ?? dossier;
    if (cachedDossier.latestCommentaire !== latest) {
      recordLocalWrite(dossier.id);
      setDossierFull({ ...cachedDossier, latestCommentaire: latest });
    }
  }

  async function submit() {
    if (!loaded || submitting || readOnly.current || !store.capabilities.ajouterCommentaire) return;
    const content = newContent.trim();
    if (!content) return;
    submitting = true;
    errorMessage = "";
    try {
      const commentaire = await store.capabilities.ajouterCommentaire(dossier.id, content);
      if (commentaire)
        commentaires = [commentaire, ...commentaires.filter(({ id }) => id !== commentaire.id)];
      newContent = "";
      syncLatestCommentaire();
    } catch {
      errorMessage = "Le commentaire n'a pas pu être enregistré.";
    } finally {
      submitting = false;
    }
  }

  function startEdit(commentaire: DossierCommentaire) {
    if (savingEdit) return;
    editingId = commentaire.id;
    editContent = commentaire.content;
  }

  async function saveEdit(commentaire: DossierCommentaire) {
    if (
      savingEdit ||
      readOnly.current ||
      !store.capabilities.modifierCommentaire ||
      commentaire.author_email !== email
    )
      return;
    const content = editContent.trim();
    if (!content) return;
    savingEdit = true;
    errorMessage = "";
    try {
      await store.capabilities.modifierCommentaire(dossier.id, { id: commentaire.id, content });
      commentaires = commentaires.map((existing) =>
        existing.id === commentaire.id
          ? { ...existing, content, updated_at: new Date() }
          : existing,
      );
      editingId = null;
      syncLatestCommentaire();
    } catch {
      errorMessage = "Le commentaire n'a pas pu être modifié.";
    } finally {
      savingEdit = false;
    }
  }

  async function deleteCommentaire(commentaire: DossierCommentaire) {
    if (
      readOnly.current ||
      !store.capabilities.supprimerCommentaire ||
      commentaire.author_email !== email
    )
      return;
    await store.capabilities.supprimerCommentaire(dossier.id, commentaire.id);
    commentaires = commentaires.filter(({ id }) => id !== commentaire.id);
    syncLatestCommentaire();
    await tick();
    newCommentInput?.focus();
  }
</script>

{#snippet avatar(authorEmail: string | null)}
  <span
    class="flex size-8 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold {avatarClass(
      authorEmail,
    )}"
    aria-hidden="true"
  >
    {authorInitials(authorEmail)}
  </span>
{/snippet}
<section class="fr-mt-4w fr-mb-4w max-w-[48rem]">
  <h4 class="fr-mb-2w fr-text--lg">Commentaires</h4>
  {#if errorMessage}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w"><p>{errorMessage}</p></div>
  {/if}
  {#if !readOnly.current && store.capabilities.ajouterCommentaire}
    <NouveauCommentaireForm
      bind:content={newContent}
      bind:input={newCommentInput}
      pending={!loaded || submitting}
      onSubmit={submit}
    >
      {@render avatar(email)}
    </NouveauCommentaireForm>
  {/if}
  <ul class="fr-mt-3w fr-p-0 flex list-none flex-col gap-4">
    {#each commentaires as commentaire (commentaire.id)}
      <li class="flex items-start gap-3">
        {@render avatar(commentaire.author_email)}
        <div class="min-w-0 grow">
          <div class="fr-mb-1v flex items-start justify-between gap-2">
            <p class="fr-mb-0 flex flex-wrap items-baseline gap-x-2">
              <strong class="leading-8">{authorName(commentaire.author_email)}</strong>
              <span class="fr-text--xs fr-mb-0 text-[color:var(--text-mention-grey)]"
                >{dateLabel(commentaire)}</span
              >
            </p>
            {#if !readOnly.current && commentaire.author_email === email && editingId !== commentaire.id && ((store.capabilities.modifierCommentaire && !savingEdit) || store.capabilities.supprimerCommentaire)}
              <CommentaireActions
                commentaireId={commentaire.id}
                onEdit={store.capabilities.modifierCommentaire && !savingEdit
                  ? () => startEdit(commentaire)
                  : undefined}
                onDelete={store.capabilities.supprimerCommentaire
                  ? () => deleteCommentaire(commentaire)
                  : undefined}
              />
            {/if}
          </div>
          {#if !readOnly.current && store.capabilities.modifierCommentaire && editingId === commentaire.id}
            <CommentaireEditor
              bind:content={editContent}
              pending={savingEdit}
              onSave={() => saveEdit(commentaire)}
              onCancel={() => (editingId = null)}
            />
          {:else}
            <p class="fr-mb-0 whitespace-pre-line [word-break:break-word]">
              {commentaire.content}
            </p>
          {/if}
        </div>
      </li>
    {:else}
      <li class="text-[color:var(--text-mention-grey)]">Aucun commentaire pour l'instant.</li>
    {/each}
  </ul>
</section>
