<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    apiScopeLabels,
    dossierStatusScope,
    type ApiGrant,
    type ApiGrantTarget,
  } from "@pitchou/types/externalApi.ts";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";

  let {
    endpoint,
    grants,
    groupes,
  }: {
    endpoint: string;
    grants: ApiGrant[];
    groupes: { id: string; name: string }[];
  } = $props();
  const formId = $props.id();
  const scopeChoices = Object.entries(apiScopeLabels);
  let kind = $state<"dossier" | "groupe">("dossier");
  let dossierId = $state<number>();
  let groupeId = $state("");
  let scope = $state<string>(dossierStatusScope);
  let busy = $state(false);
  let failure = $state("");

  async function change(method: "POST" | "DELETE", target: ApiGrantTarget, scope: string) {
    if (busy) return;
    busy = true;
    failure = "";
    try {
      await apiSettingsRequest(endpoint, method, { ...target, scope });
      if (method === "POST") {
        dossierId = undefined;
        groupeId = "";
      }
      await invalidateAll();
    } catch (error) {
      failure =
        error instanceof Error ? error.message : "Modification de l’habilitation impossible.";
    } finally {
      busy = false;
    }
  }

  function add(event: SubmitEvent) {
    event.preventDefault();
    if (kind === "dossier" && dossierId) void change("POST", { dossierId }, scope);
    if (kind === "groupe" && groupeId) void change("POST", { groupeId }, scope);
  }
</script>

<section
  class="space-y-4 border-t border-[var(--border-default-grey)] pt-4"
  aria-labelledby={`${formId}-title`}
>
  <h3 id={`${formId}-title`} class="fr-h6 m-0!">Habilitations</h3>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  {#if grants.length}
    <ul class="m-0! list-none divide-y divide-[var(--border-default-grey)] p-0!">
      {#each grants as grant (`${grant.scope}:${"dossierId" in grant ? grant.dossierId : grant.groupeId}`)}
        <li class="flex flex-wrap items-center justify-between gap-2 py-2!">
          <span class="fr-text--sm">{grant.label} · {apiScopeLabels[grant.scope]}</span>
          <button
            type="button"
            class="fr-btn fr-btn--secondary fr-btn--sm"
            disabled={busy}
            onclick={() =>
              change(
                "DELETE",
                "dossierId" in grant
                  ? { dossierId: grant.dossierId }
                  : { groupeId: grant.groupeId },
                grant.scope,
              )}
            aria-label={`Retirer l’habilitation ${grant.label}`}>Retirer</button
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p class="fr-text--sm m-0!">Aucun dossier ni groupe habilité.</p>
  {/if}

  <form onsubmit={add} class="space-y-3">
    <div class="grid gap-3 md:grid-cols-3">
      <div class="fr-select-group m-0!">
        <label class="fr-label" for={`${formId}-target`}>Type de ressource</label>
        <select class="fr-select" id={`${formId}-target`} bind:value={kind} disabled={busy}>
          <option value="dossier">Dossier</option>
          <option value="groupe">Groupe instructeur</option>
        </select>
      </div>
      {#if kind === "dossier"}
        <div class="fr-input-group m-0!">
          <label class="fr-label" for={`${formId}-dossier`}>Numéro de dossier Pitchou</label>
          <input
            class="fr-input"
            id={`${formId}-dossier`}
            type="number"
            min="1"
            max="2147483647"
            required
            bind:value={dossierId}
            disabled={busy}
          />
        </div>
      {:else}
        <div class="fr-select-group m-0!">
          <label class="fr-label" for={`${formId}-groupe`}>Groupe instructeur</label>
          <select
            class="fr-select"
            id={`${formId}-groupe`}
            bind:value={groupeId}
            required
            disabled={busy}
          >
            <option value="">Sélectionner un groupe</option>
            {#each groupes as groupe (groupe.id)}<option value={groupe.id}>{groupe.name}</option
              >{/each}
          </select>
        </div>
      {/if}
      <div class="fr-select-group m-0!">
        <label class="fr-label" for={`${formId}-scope`}>Permission</label>
        <select class="fr-select" id={`${formId}-scope`} bind:value={scope} disabled={busy}>
          {#each scopeChoices as [value, label] (value)}<option {value}>{label}</option>{/each}
        </select>
      </div>
    </div>
    <button
      type="submit"
      class="fr-btn fr-btn--secondary"
      disabled={busy || (kind === "dossier" ? !dossierId : !groupeId)}
      >Ajouter l’habilitation</button
    >
  </form>
</section>
