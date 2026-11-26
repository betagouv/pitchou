<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import ApiKeySettings from "@pitchou/ui/ApiKeySettings.svelte";
  import { apiSettingsRequest } from "@pitchou/ui/apiSettingsRequest.ts";
  import { serviceApiKeyLifetimes, serviceScopes } from "@pitchou/types/externalApi.ts";
  import ApiIntegrationDialog from "./ApiIntegrationDialog.svelte";
  import ServiceApiGrants from "./ServiceApiGrants.svelte";
  import type { PageData } from "./$types";

  let {
    integration,
    groupes,
    open = $bindable(false),
  }: {
    integration: PageData["integrations"][number];
    groupes: PageData["groupes"];
    open?: boolean;
  } = $props();

  const endpoint = $derived(`/api/integrations-api/${encodeURIComponent(integration.id)}`);
  const serviceAction = $derived(
    integration.enabled ? "Désactiver le service" : "Activer le service",
  );
  const panelId = $props.id();
  const tabs = [
    { key: "keys", label: "Clés" },
    { key: "grants", label: "Habilitations" },
    { key: "settings", label: "Paramètres" },
  ] as const;
  let selected = $state<(typeof tabs)[number]["key"]>("keys");
  let tabList: HTMLDivElement;
  let updating = $state(false);
  let failure = $state("");

  function moveTab(event: KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selected = tabs[next].key;
    tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  async function toggleService() {
    if (updating) return;
    updating = true;
    failure = "";
    try {
      await apiSettingsRequest(endpoint, "PATCH", { enabled: !integration.enabled });
      await invalidateAll();
    } catch (error) {
      failure = error instanceof Error ? error.message : "Modification du service impossible.";
    } finally {
      updating = false;
    }
  }
</script>

<details class="admin-panel group" bind:open>
  <summary
    class="flex cursor-pointer list-none items-center gap-3 rounded-xl hover:bg-[var(--background-lifted-grey-hover)] group-open:rounded-b-none [&::-webkit-details-marker]:hidden"
  >
    <span class="min-w-0 grow [overflow-wrap:anywhere]">{integration.name}</span>
    <span
      class="fr-badge fr-badge--sm fr-badge--no-icon shrink-0"
      class:fr-badge--success={integration.enabled}
    >
      {integration.enabled ? "Actif" : "Désactivé"}
    </span>
    <span
      class="fr-icon-arrow-down-s-line fr-icon--sm shrink-0 transition-transform group-open:rotate-180"
      aria-hidden="true"
    ></span>
  </summary>

  <div
    class="service-tabs"
    role="tablist"
    aria-label={`Service ${integration.name}`}
    bind:this={tabList}
  >
    {#each tabs as { key, label }, index (key)}
      <button
        type="button"
        role="tab"
        id={`${panelId}-tab-${key}`}
        aria-selected={selected === key}
        aria-controls={`${panelId}-panel-${key}`}
        tabindex={selected === key ? 0 : -1}
        onclick={() => (selected = key)}
        onkeydown={(event) => moveTab(event, index)}>{label}</button
      >
    {/each}
  </div>

  <div
    class="pt-4"
    role="tabpanel"
    id={`${panelId}-panel-keys`}
    aria-labelledby={`${panelId}-tab-keys`}
    hidden={selected !== "keys"}
    tabindex="0"
  >
    <ApiKeySettings
      endpoint={`${endpoint}/keys`}
      keys={integration.keys}
      title="Clés de service"
      availableScopes={serviceScopes}
      availableLifetimes={serviceApiKeyLifetimes}
      onChange={invalidateAll}
      createDialog={ApiIntegrationDialog}
    />
  </div>
  <div
    class="pt-4"
    role="tabpanel"
    id={`${panelId}-panel-grants`}
    aria-labelledby={`${panelId}-tab-grants`}
    hidden={selected !== "grants"}
    tabindex="0"
  >
    <ServiceApiGrants endpoint={`${endpoint}/grants`} grants={integration.grants} {groupes} />
  </div>
  <div
    class="pt-4"
    role="tabpanel"
    id={`${panelId}-panel-settings`}
    aria-labelledby={`${panelId}-tab-settings`}
    hidden={selected !== "settings"}
    tabindex="0"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <dl class="fr-text--sm m-0! min-w-0 [overflow-wrap:anywhere]">
          <dt class="text-[var(--text-mention-grey)]">Identifiant du service</dt>
          <dd class="m-0!"><code>{integration.id}</code></dd>
        </dl>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary fr-btn--sm"
          disabled={updating}
          onclick={toggleService}
        >
          {updating ? "Enregistrement…" : serviceAction}
        </button>
      </div>
      {#if integration.allowOAuth}
        <p class="fr-text--sm m-0! text-[var(--text-mention-grey)]">
          Authentification OAuth autorisée.
        </p>
      {/if}
      {#if !integration.enabled}
        <p class="fr-text--sm m-0! text-[var(--text-mention-grey)]">
          Les appels API de ce service sont suspendus.
        </p>
      {/if}
      {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
    </div>
  </div>
</details>

<style>
  .service-tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-default-grey);
  }

  .service-tabs button {
    padding: 0.75rem 0.5rem;
    border-bottom: 3px solid transparent;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .service-tabs button[aria-selected="true"] {
    border-bottom-color: var(--border-action-high-blue-france);
    color: var(--text-action-high-blue-france);
  }

  @media (min-width: 576px) {
    .service-tabs button {
      padding-inline: 1rem;
    }
  }
</style>
