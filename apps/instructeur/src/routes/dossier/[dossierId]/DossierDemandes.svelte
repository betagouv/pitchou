<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { loadDossiers } from "#lib/dossier/dossier.ts";
  import type { DossierWorkspace } from "@pitchou/types/dossierDemandes.ts";
  import { fetchVersionData } from "./Dossier/DossierVersions/api.ts";
  let { dossierId, readOnly }: { dossierId: number; readOnly: boolean } = $props();
  let workspace = $state<DossierWorkspace>();
  let errorMessage = $state("");
  let action = $state<"create" | "link" | null>(null);
  let label = $state("");
  let otherId = $state<number>();
  let busy = $state(false);
  $effect(() => {
    const controller = new AbortController();
    void fetchVersionData<DossierWorkspace>(`/dossier/${dossierId}/demandes`, controller.signal)
      .then((result) => {
        workspace = result;
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      });
    return () => controller.abort();
  });
  function select(id: number) {
    const url = new URL(page.url.href);
    url.pathname = `/dossier/${id}`;
    void goto(url);
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    errorMessage = "";
    try {
      const response = await fetch(`/dossier/${dossierId}/demandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "create" ? { action, label } : { action, demandeId: otherId },
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible d’ajouter la demande.");
      await loadDossiers();
      action = null;
      select(result.demandeId);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Impossible d’ajouter la demande.";
    } finally {
      busy = false;
    }
  }
</script>

<section
  class="fr-p-2w border-b border-[var(--border-default-grey)]"
  aria-label="Demandes du dossier"
>
  {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
  {#if workspace}
    {#if workspace.projet}<p class="fr-mb-1w font-bold">{workspace.projet.name}</p>{/if}
    <div class="flex flex-wrap items-end gap-4">
      <div class="min-w-64 flex-1">
        <label for="active-demande" class="fr-label">Demande du dossier</label>
        <select
          id="active-demande"
          class="fr-select"
          value={dossierId}
          onchange={(event) => select(Number(event.currentTarget.value))}
        >
          {#each workspace.demandes as demande (demande.id)}<option value={demande.id}
              >{demande.label} — {demande.phase}</option
            >{/each}
        </select>
      </div>
      {#if !readOnly && workspace.access === "complet"}
        <button
          class="fr-btn fr-btn--secondary"
          onclick={() => {
            action = action === "create" ? null : "create";
          }}>Nouvelle demande</button
        >
        <button
          class="fr-btn fr-btn--tertiary"
          onclick={() => {
            action = action === "link" ? null : "link";
          }}>Rattacher une demande existante</button
        >
      {/if}
    </div>
    {#if workspace.demandes.length > 1}
      <p class="fr-text--sm fr-mt-1w fr-mb-0">
        Les onglets et le suivi concernent la demande sélectionnée. Les accès sont communs au
        dossier.
      </p>
    {/if}
    {#if action && !readOnly}
      <form class="fr-mt-2w" onsubmit={submit}>
        <p>
          Les accès sont communs à toutes les demandes du dossier. Chaque demande conserve ses
          propres données et son avancement.
        </p>
        {#if action === "create"}
          <label for="demande-label" class="fr-label">Libellé de la nouvelle demande</label>
          <input id="demande-label" class="fr-input" bind:value={label} required maxlength="200" />
        {:else}
          <label for="demande-id" class="fr-label"
            >Identifiant Pitchou de la demande à rattacher</label
          >
          <input
            id="demande-id"
            class="fr-input"
            type="number"
            min="1"
            step="1"
            bind:value={otherId}
            required
          />
        {/if}
        <div class="flex gap-3 fr-mt-2w">
          <button class="fr-btn" disabled={busy}
            >{action === "create" ? "Créer la demande" : "Rattacher et partager les accès"}</button
          ><button
            type="button"
            class="fr-btn fr-btn--tertiary"
            onclick={() => {
              action = null;
            }}>Annuler</button
          >
        </div>
      </form>
    {/if}
  {/if}
</section>
