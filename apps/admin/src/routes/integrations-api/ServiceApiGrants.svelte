<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    dossierGrantScopeLabels,
    dossierReadScope,
    apiScopeLabel,
    type ApiGrant,
    type ApiGrantTarget,
    type DossierGrantScope,
  } from "@pitchou/types/externalApi.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectOption } from "@pitchou/ui/Select/options.ts";
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
  type ResourceKind = "dossier" | "groupe";
  const resourceOptions: SelectOption<ResourceKind>[] = [
    { value: "dossier", label: "Dossier" },
    { value: "groupe", label: "Groupe instructeur" },
  ];
  const scopeOptions = (Object.keys(dossierGrantScopeLabels) as DossierGrantScope[]).map(
    (value) => ({
      value,
      label: dossierGrantScopeLabels[value],
    }),
  );
  const groupeOptions = $derived(groupes.map(({ id, name }) => ({ value: id, label: name })));
  let kind = $state<ResourceKind>("dossier");
  let dossierId = $state<number>();
  let groupeId = $state("");
  let scope: DossierGrantScope = $state(dossierReadScope);
  let busy = $state(false);
  let failure = $state("");

  async function change(
    method: "POST" | "DELETE",
    target: ApiGrantTarget,
    scope: ApiGrant["scope"],
  ) {
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
  class="flex flex-col gap-4 border-t border-[var(--border-default-grey)] pt-4"
  aria-labelledby={`${formId}-title`}
>
  <h3 id={`${formId}-title`} class="m-0! text-base! font-bold">Habilitations</h3>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  <form onsubmit={add} autocomplete="off" class="flex flex-col items-start gap-4">
    <div class="grid w-full gap-4 md:grid-cols-3">
      <div class="fr-select-group m-0!">
        <label class="fr-label" for={`${formId}-target`}>Type de ressource</label>
        <Select
          id={`${formId}-target`}
          class="fr-mt-1w"
          options={resourceOptions}
          bind:value={kind}
          disabled={busy}
        />
      </div>
      {#if kind === "dossier"}
        <div class="fr-input-group m-0!">
          <label class="fr-label" for={`${formId}-dossier`}>Numéro de dossier Pitchou</label>
          <input
            class="fr-input"
            id={`${formId}-dossier`}
            type="number"
            autocomplete="off"
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
          <Select
            id={`${formId}-groupe`}
            class="fr-mt-1w"
            options={groupeOptions}
            placeholder="Sélectionner un groupe"
            bind:value={groupeId}
            required
            disabled={busy}
          />
        </div>
      {/if}
      <div class="fr-select-group m-0!">
        <label class="fr-label" for={`${formId}-scope`}>Permission</label>
        <Select
          id={`${formId}-scope`}
          class="fr-mt-1w"
          options={scopeOptions}
          bind:value={scope}
          disabled={busy}
        />
      </div>
    </div>
    <button
      type="submit"
      class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
      disabled={busy || (kind === "dossier" ? !dossierId : !groupeId)}
    >
      Ajouter l’habilitation
    </button>
  </form>

  {#if grants.length}
    <ul
      class="m-0! list-none divide-y divide-[var(--border-default-grey)] rounded-lg border border-[var(--border-default-grey)] p-0!"
    >
      {#each grants as grant (`${grant.scope}:${"dossierId" in grant ? grant.dossierId : grant.groupeId}`)}
        <li class="flex flex-wrap items-center justify-between gap-3 p-4!">
          <div class="min-w-0 [overflow-wrap:anywhere]">
            <p class="m-0! text-sm font-bold">{grant.label}</p>
            <p class="m-0! text-sm text-[var(--text-mention-grey)]">
              {apiScopeLabel(grant.scope)}
            </p>
          </div>
          <button
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm"
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
    <p class="m-0! text-sm text-[var(--text-mention-grey)]">Aucun dossier ni groupe habilité.</p>
  {/if}
</section>
