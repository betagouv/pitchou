<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import ApiKeySettings from "@pitchou/ui/ApiKeySettings.svelte";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";
  import ServiceApiGrants from "./ServiceApiGrants.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  let name = $state("");
  let activeIntegration = $state<string>();
  let updating = $state(false);
  let failure = $state("");

  async function create(event: SubmitEvent) {
    event.preventDefault();
    await update(async () => {
      const response = await apiSettingsRequest("/api/integrations-api", "POST", { name });
      activeIntegration = (await response.json()).id;
      name = "";
    });
  }

  async function update(action: () => Promise<unknown>) {
    if (updating) return;
    updating = true;
    failure = "";
    try {
      await action();
      await invalidateAll();
    } catch (error) {
      failure = error instanceof Error ? error.message : "Enregistrement impossible.";
    } finally {
      updating = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
  <p class="m-0!">Gérez les accès à l’API accordés aux services partenaires.</p>
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  <form
    onsubmit={create}
    class="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4"
  >
    <div class="fr-input-group m-0! w-full max-w-sm">
      <label class="fr-label" for="integration-name">Nom du service</label>
      <input
        id="integration-name"
        class="fr-input"
        bind:value={name}
        maxlength="80"
        required
        disabled={updating}
      />
    </div>
    <button class="fr-btn" type="submit" disabled={updating || !name.trim()}
      >Ajouter un service</button
    >
  </form>

  {#each data.integrations as integration (integration.id)}
    {@const endpoint = `/api/integrations-api/${encodeURIComponent(integration.id)}`}
    <details
      class="rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-alt-grey)]"
      open={data.integrations.length === 1 || activeIntegration === integration.id}
    >
      <summary class="cursor-pointer p-4">
        <span class="mr-2 font-bold">{integration.name}</span>
        <span
          class="fr-badge fr-badge--sm fr-badge--no-icon {integration.enabled
            ? 'fr-badge--success'
            : ''}"
        >
          {integration.enabled ? "Actif" : "Désactivé"}
        </span>
      </summary>
      <div class="space-y-5 border-t border-[var(--border-default-grey)] p-4 md:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="fr-text--sm m-0! break-all">
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
            onclick={() =>
              update(() =>
                apiSettingsRequest(endpoint, "PATCH", { enabled: !integration.enabled }),
              )}
          >
            {integration.enabled ? "Désactiver le service" : "Activer le service"}
          </button>
        </div>
        <ApiKeySettings
          endpoint={`${endpoint}/cles`}
          keys={integration.keys}
          title="Clés de service"
          onChange={invalidateAll}
        />
        <ServiceApiGrants
          endpoint={`${endpoint}/habilitations`}
          grants={integration.grants}
          groupes={data.groupes}
        />
      </div>
    </details>
  {:else}
    <p>Aucun service partenaire configuré.</p>
  {/each}
</div>
