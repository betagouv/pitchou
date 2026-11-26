<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    apiScopeLabel,
    dossierGrantScopeLabels,
    retiredStatusScope,
    type ApiGrant,
    type ApiGrantTarget,
  } from "@pitchou/types/externalApi.ts";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";
  import AddApiGrantDialog from "./AddApiGrantDialog.svelte";

  let {
    endpoint,
    grants,
    groupes,
  }: {
    endpoint: string;
    grants: ApiGrant[];
    groupes: { id: string; name: string }[];
  } = $props();
  const headingId = $props.id();
  let adding = $state(false);
  let removing = $state(false);
  let failure = $state("");

  async function change(
    method: "POST" | "DELETE",
    target: ApiGrantTarget,
    scope: ApiGrant["scope"],
  ) {
    await apiSettingsRequest(endpoint, method, { ...target, scope });
    await invalidateAll();
  }

  async function remove(target: ApiGrantTarget, scope: ApiGrant["scope"]) {
    if (removing) return;
    removing = true;
    failure = "";
    try {
      await change("DELETE", target, scope);
    } catch (error) {
      failure = error instanceof Error ? error.message : "Retrait de l’habilitation impossible.";
    } finally {
      removing = false;
    }
  }
</script>

<section class="flex flex-col gap-4" aria-labelledby={headingId}>
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 id={headingId} class="m-0! text-base! font-bold">Habilitations</h3>
      <p class="fr-text--sm m-0! text-[var(--text-mention-grey)]">
        Dossiers accessibles au service selon les permissions de sa clé.
      </p>
    </div>
    <button
      type="button"
      class="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
      disabled={removing}
      onclick={() => (adding = true)}
    >
      Ajouter une habilitation
    </button>
  </header>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}

  <div class="rounded-lg border border-[var(--border-default-grey)]">
    {#if grants.length}
      <ul class="m-0! list-none divide-y divide-[var(--border-default-grey)] p-0!">
        {#each grants as grant (`${grant.scope}:${"dossierId" in grant ? grant.dossierId : "groupeId" in grant ? grant.groupeId : "all"}`)}
          {@const target =
            "dossierId" in grant
              ? { dossierId: grant.dossierId }
              : "groupeId" in grant
                ? { groupeId: grant.groupeId }
                : { allDossiers: grant.allDossiers }}
          {@const permission =
            grant.scope === retiredStatusScope
              ? apiScopeLabel(grant.scope)
              : dossierGrantScopeLabels[grant.scope]}
          <li class="flex flex-wrap items-center justify-between gap-3 p-4!">
            <div class="min-w-0 [overflow-wrap:anywhere]">
              <p class="m-0! text-sm font-bold">{grant.label}</p>
              <p class="m-0! text-sm text-[var(--text-mention-grey)]">{permission}</p>
            </div>
            <button
              type="button"
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
              disabled={removing}
              onclick={() => remove(target, grant.scope)}
              aria-label={`Retirer l’habilitation ${grant.label} · ${permission}`}>Retirer</button
            >
          </li>
        {/each}
      </ul>
    {:else}
      <p class="m-0! p-4 text-sm text-[var(--text-mention-grey)]">
        Ce service n’a accès à aucun dossier.
      </p>
    {/if}
  </div>
</section>

{#if adding}
  <AddApiGrantDialog
    {groupes}
    onClose={() => (adding = false)}
    onAdd={(target, scope) => change("POST", target, scope)}
  />
{/if}
