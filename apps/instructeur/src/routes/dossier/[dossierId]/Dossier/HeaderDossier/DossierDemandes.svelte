<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { loadDossiers } from "#lib/dossier/dossier.ts";
  import type { DossierWorkspace } from "@pitchou/types/dossierDemandes.ts";
  import { fetchVersionData } from "../DossierVersions/api.ts";
  import DemandeSwitcher from "./DemandeSwitcher.svelte";
  import CreateDemandeModal from "./CreateDemandeModal.svelte";
  let {
    dossierId,
    readOnly,
    action = $bindable(null),
    canManage = $bindable(false),
  }: {
    dossierId: number;
    readOnly: boolean;
    action?: "create" | "link" | null;
    canManage?: boolean;
  } = $props();
  let workspace = $state<DossierWorkspace>();
  let errorMessage = $state("");
  let label = $state("");
  let otherId = $state<number>();
  let busy = $state(false);
  $effect(() => {
    canManage = !readOnly && workspace?.access === "complet";
  });
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
  function closeAction() {
    if (busy) return;
    action = null;
    label = "";
    errorMessage = "";
    document
      .querySelector<HTMLButtonElement>(`button[aria-controls="dossier-actions-menu-${dossierId}"]`)
      ?.focus();
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
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

<div>
  {#if errorMessage && !action}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
  {#if workspace}
    <DemandeSwitcher demandes={workspace.demandes} {dossierId} onSelect={select} />
    {#if action && canManage}
      {#if action === "create"}
        <CreateDemandeModal {busy} onClose={closeAction}>{@render actionForm()}</CreateDemandeModal>
      {:else}
        <div class="fr-mt-2w">{@render actionForm()}</div>
      {/if}
    {/if}
  {/if}
</div>

{#snippet actionForm()}
  <form onsubmit={submit} aria-busy={busy}>
    <p>
      Les accès sont communs à toutes les demandes du dossier. Chaque demande conserve ses propres
      données et son avancement.
    </p>
    {#if action === "create"}
      <label for="demande-label" class="fr-label">Libellé de la nouvelle demande</label>
      <input
        id="demande-label"
        class="fr-input"
        bind:value={label}
        required
        maxlength="200"
        disabled={busy}
      />
    {:else}
      <label for="demande-id" class="fr-label">Identifiant Pitchou de la demande à rattacher</label>
      <input
        id="demande-id"
        class="fr-input"
        type="number"
        min="1"
        step="1"
        bind:value={otherId}
        required
        disabled={busy}
      />
    {/if}
    {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
    <div class="flex flex-wrap gap-3 fr-mt-3w">
      <button class="fr-btn" disabled={busy}
        >{busy
          ? "Enregistrement…"
          : action === "create"
            ? "Créer la demande"
            : "Rattacher et partager les accès"}</button
      ><button type="button" class="fr-btn fr-btn--tertiary" disabled={busy} onclick={closeAction}
        >Annuler</button
      >
    </div>
  </form>
{/snippet}
