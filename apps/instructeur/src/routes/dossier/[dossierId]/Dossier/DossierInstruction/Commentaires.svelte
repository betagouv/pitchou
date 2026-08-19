<script lang="ts">
  import { setDossierFull, store } from "$lib/state/store.svelte.ts";
  import { sendEvenementModifierCommentaire } from "$lib/shared/aarri.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { authorInitials, authorName, avatarClass } from "./commentaires.ts";
  import type { DossierCommentaire } from "@pitchou/types/capabilities.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
  };
  let { dossier, email }: Props = $props();

  let commentaires: DossierCommentaire[] = $state([]);
  let newContent = $state("");
  let editingId: string | null = $state(null);
  let editContent = $state("");
  let errorMessage = $state("");

  $effect(() => {
    void store.capabilities
      .listerCommentaires?.(dossier.id)
      .then((list) => (commentaires = list))
      .catch(() => (errorMessage = "Les commentaires n'ont pas pu être chargés."));
  });

  function dateLabel({ author_email, created_at, updated_at }: DossierCommentaire): string {
    // The migrated free comment predates the comment feature.
    if (!author_email) return "avant 09/2026";
    const written = `Le ${formatDateAbsolute(new Date(created_at), "dd/MM/yyyy")}`;
    return updated_at
      ? `${written} · modifié le ${formatDateAbsolute(new Date(updated_at), "dd/MM/yyyy")}`
      : written;
  }

  // The dossier list and the tableau de suivi display the most recent commentaire,
  // so the cached dossier is refreshed alongside the thread.
  function syncLatestCommentaire() {
    const latest = commentaires[0]?.content ?? null;
    if (dossier.latestCommentaire !== latest) {
      setDossierFull({ ...dossier, latestCommentaire: latest });
    }
  }

  async function submit() {
    const content = newContent.trim();
    if (!content) return;
    errorMessage = "";
    try {
      const commentaire = await store.capabilities.ajouterCommentaire?.(dossier.id, content);
      if (commentaire) commentaires = [commentaire, ...commentaires];
      newContent = "";
      sendEvenementModifierCommentaire();
      syncLatestCommentaire();
    } catch {
      errorMessage = "Le commentaire n'a pas pu être enregistré.";
    }
  }

  function startEdit(commentaire: DossierCommentaire) {
    editingId = commentaire.id;
    editContent = commentaire.content;
  }

  async function saveEdit(commentaire: DossierCommentaire) {
    const content = editContent.trim();
    if (!content) return;
    errorMessage = "";
    try {
      await store.capabilities.modifierCommentaire?.(dossier.id, { id: commentaire.id, content });
      commentaires = commentaires.map((existing) =>
        existing.id === commentaire.id
          ? { ...existing, content, updated_at: new Date() }
          : existing,
      );
      editingId = null;
      sendEvenementModifierCommentaire();
      syncLatestCommentaire();
    } catch {
      errorMessage = "Le commentaire n'a pas pu être modifié.";
    }
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
  <h2 class="fr-mb-2w fr-text--lg">Commentaires</h2>

  {#if errorMessage}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w"><p>{errorMessage}</p></div>
  {/if}

  <form
    class="flex items-start gap-3"
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    {@render avatar(email)}
    <div class="flex grow flex-col items-end gap-2">
      <textarea
        class="fr-input resize-y"
        id="nouveau-commentaire"
        aria-label="Laissez un commentaire"
        placeholder="Laissez un commentaire…"
        rows={2}
        bind:value={newContent}></textarea>
      {#if newContent.trim()}
        <button type="submit" class="fr-btn fr-btn--sm">Commenter</button>
      {/if}
    </div>
  </form>

  <ul class="fr-mt-3w fr-p-0 flex list-none flex-col gap-4">
    {#each commentaires as commentaire (commentaire.id)}
      <li class="flex items-start gap-3">
        {@render avatar(commentaire.author_email)}
        <div class="min-w-0 grow">
          <p class="fr-mb-1v flex flex-wrap items-baseline gap-x-2">
            <strong>{authorName(commentaire.author_email)}</strong>
            <span class="fr-text--xs text-[color:var(--text-mention-grey)]"
              >{dateLabel(commentaire)}</span
            >
            {#if commentaire.author_email === email && editingId !== commentaire.id}
              <button
                type="button"
                class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-pencil-line"
                title="Modifier le commentaire"
                onclick={() => startEdit(commentaire)}
              >
                Modifier le commentaire
              </button>
            {/if}
          </p>
          {#if editingId === commentaire.id}
            <textarea
              class="fr-input resize-y"
              aria-label="Modifier le commentaire"
              rows={3}
              bind:value={editContent}></textarea>
            <div class="fr-mt-1w flex gap-2">
              <button type="button" class="fr-btn fr-btn--sm" onclick={() => saveEdit(commentaire)}>
                Enregistrer
              </button>
              <button
                type="button"
                class="fr-btn fr-btn--secondary fr-btn--sm"
                onclick={() => (editingId = null)}
              >
                Annuler
              </button>
            </div>
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
