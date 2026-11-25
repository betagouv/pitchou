<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import ApiKeySettings from "@pitchou/ui/ApiKeySettings.svelte";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";
  import { serviceScopes } from "@pitchou/types/externalApi.ts";
  import AddApiIntegrationDialog from "./AddApiIntegrationDialog.svelte";
  import ServiceApiGrants from "./ServiceApiGrants.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  let adding = $state(false);
  let activeIntegration = $state<string>();
  let updating = $state(false);
  let failure = $state("");

  $effect(() => {
    pageHeader.setAction({ label: "Ajouter un service", onClick: () => (adding = true) });
    return () => pageHeader.clearAction();
  });

  async function onCreated(id: string) {
    adding = false;
    activeIntegration = id;
    failure = "";
    try {
      await invalidateAll();
    } catch {
      failure = "Le service a été créé. Rechargez la page pour actualiser la liste.";
    }
  }

  async function setEnabled(endpoint: string, enabled: boolean) {
    if (updating) return;
    updating = true;
    failure = "";
    try {
      await apiSettingsRequest(endpoint, "PATCH", { enabled });
      await invalidateAll();
    } catch (error) {
      failure = error instanceof Error ? error.message : "Enregistrement impossible.";
    } finally {
      updating = false;
    }
  }
</script>

<svelte:head><title>Intégrations API - Administration - Pitchou</title></svelte:head>

<div class="admin-stack">
  {#if failure}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{failure}</p></div>
  {/if}

  {#each data.integrations as integration (integration.id)}
    {@const endpoint = `/api/integrations-api/${encodeURIComponent(integration.id)}`}
    <details
      class="admin-panel group"
      open={data.integrations.length === 1 || activeIntegration === integration.id}
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-3 rounded-t-xl hover:bg-[var(--background-lifted-grey-hover)] group-open:rounded-b-none rounded-b-xl [&::-webkit-details-marker]:hidden"
      >
        <span class="min-w-0 grow [overflow-wrap:anywhere]">{integration.name}</span>
        <span
          class="fr-badge fr-badge--sm fr-badge--no-icon {integration.enabled
            ? 'fr-badge--success'
            : ''}"
        >
          {integration.enabled ? "Actif" : "Désactivé"}
        </span>
        <span
          class="fr-icon-arrow-down-s-line fr-icon--sm shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="flex flex-col gap-4">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default-grey)] pb-4"
        >
          <div class="min-w-0 text-[var(--text-mention-grey)]">
            <p class="fr-text--sm m-0! [overflow-wrap:anywhere]">
              Identifiant du service <code>{integration.id}</code>
            </p>
            {#if integration.allowOAuth}<p class="fr-text--sm m-0!">
                Authentification OAuth également autorisée.
              </p>{/if}
          </div>
          <button
            class="fr-btn fr-btn--secondary fr-btn--sm"
            type="button"
            disabled={updating}
            onclick={() => setEnabled(endpoint, !integration.enabled)}
          >
            {integration.enabled ? "Désactiver le service" : "Activer le service"}
          </button>
        </div>
        <ApiKeySettings
          endpoint={`${endpoint}/keys`}
          keys={integration.keys}
          title="Clés de service"
          availableScopes={serviceScopes}
          onChange={invalidateAll}
        />
        <ServiceApiGrants
          endpoint={`${endpoint}/grants`}
          grants={integration.grants}
          groupes={data.groupes}
        />
      </div>
    </details>
  {:else}
    <div class="admin-panel">
      <p class="m-0! text-sm text-[var(--text-mention-grey)]">
        Aucun service partenaire configuré.
      </p>
    </div>
  {/each}
</div>

{#if adding}
  <AddApiIntegrationDialog onClose={() => (adding = false)} {onCreated} />
{/if}
