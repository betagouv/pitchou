<script lang="ts">
  import { untrack, type Component, type Snippet } from "svelte";
  import {
    apiKeyLifetimes,
    dossierReadScope,
    type ApiKeyInput,
    type ApiKeySummary,
    type ApiScope,
  } from "@pitchou/types/externalApi.ts";
  import { apiSettingsRequest } from "./apiSettingsRequest.ts";
  import ApiKeyFields from "./ApiKeySettings/ApiKeyFields.svelte";
  import ApiKeyList from "./ApiKeySettings/ApiKeyList.svelte";
  import IssuedApiKey from "./ApiKeySettings/IssuedApiKey.svelte";

  let {
    endpoint,
    keys,
    title,
    onChange,
    availableScopes,
    availableLifetimes = apiKeyLifetimes,
    createDialog: Dialog,
  }: {
    endpoint: string;
    keys: ApiKeySummary[];
    title: string;
    onChange: () => Promise<void>;
    availableScopes: readonly ApiScope[];
    availableLifetimes?: readonly ApiKeyInput["days"][];
    createDialog?: Component<{
      title: string;
      busy: boolean;
      onClose: () => void;
      initialFocus: () => void;
      children: Snippet;
      footer: Snippet;
    }>;
  } = $props();

  const formId = $props.id();
  let label = $state("");
  let days = $state<ApiKeyInput["days"]>(30);
  let scopes = $state<ApiScope[]>(
    untrack(() => (availableScopes.includes(dossierReadScope) ? [dossierReadScope] : [])),
  );
  const selectedScopes = $derived(scopes.filter((scope) => availableScopes.includes(scope)));
  let busy = $state(false);
  let creating = $state(false);
  let nameInput = $state<HTMLInputElement>();
  let failure = $state("");
  let creationFailure = $state("");
  let notice = $state("");
  let issued = $state<{ key: ApiKeySummary; secret: string }>();

  async function refresh() {
    await onChange().catch(() => {
      failure = "Rechargez la page pour actualiser vos clés.";
    });
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (busy || selectedScopes.length === 0) return;
    busy = true;
    failure = "";
    creationFailure = "";
    notice = "";
    try {
      const response = await apiSettingsRequest(endpoint, "POST", {
        label,
        scopes: selectedScopes,
        days,
      });
      issued = await response.json();
      label = "";
      await refresh();
    } catch (error) {
      creationFailure = error instanceof Error ? error.message : "Création de la clé impossible.";
    } finally {
      busy = false;
    }
  }

  async function revoke(id: string) {
    if (busy) return false;
    busy = true;
    failure = "";
    notice = "";
    try {
      await apiSettingsRequest(endpoint, "DELETE", { id });
      if (issued?.key.id === id) issued = undefined;
      notice = "Clé révoquée.";
      await refresh();
      return true;
    } catch (error) {
      failure = error instanceof Error ? error.message : "Révocation de la clé impossible.";
      return false;
    } finally {
      busy = false;
    }
  }

  function closeCreation() {
    creating = false;
    creationFailure = "";
    issued = undefined;
  }
</script>

{#snippet keyForm()}
  <form id={formId} onsubmit={create} autocomplete="off" class="flex flex-col gap-4">
    <ApiKeyFields
      {formId}
      {busy}
      {availableScopes}
      {availableLifetimes}
      {selectedScopes}
      bind:label
      bind:days
      bind:scopes
      bind:nameInput
    />
    {#if creationFailure}<p class="fr-error-text m-0!" role="alert">{creationFailure}</p>{/if}
    {#if !Dialog}{@render submitButton()}{/if}
  </form>
{/snippet}

{#snippet submitButton()}
  <button
    type="submit"
    form={formId}
    class="fr-btn self-start"
    class:fr-btn--icon-left={!Dialog}
    class:fr-icon-add-line={!Dialog}
    disabled={busy || !label.trim() || selectedScopes.length === 0}
  >
    {busy ? "Création…" : "Créer la clé"}
  </button>
{/snippet}

<section aria-labelledby={`${formId}-title`} class="flex flex-col gap-4">
  <header class="flex flex-wrap items-center justify-between gap-3">
    <h3 id={`${formId}-title`} class="m-0! text-base! font-bold">{title}</h3>
    {#if Dialog}
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
        disabled={busy}
        onclick={() => (creating = true)}
      >
        Créer une clé de service
      </button>
    {/if}
  </header>
  {#if !Dialog}{@render keyForm()}{/if}
  {#if failure}<p class="fr-error-text m-0!" role="alert">{failure}</p>{/if}
  {#if notice}<p class="fr-valid-text m-0!" role="status">{notice}</p>{/if}
  {#if !Dialog && issued}
    {#key issued.key.id}
      <IssuedApiKey {issued} onDismiss={() => (issued = undefined)} />
    {/key}
  {/if}
  <ApiKeyList {keys} {busy} onRevoke={revoke} />
</section>

{#if Dialog && creating}
  <Dialog
    title={issued ? "Clé de service créée" : "Créer une clé de service"}
    {busy}
    onClose={closeCreation}
    initialFocus={() => nameInput?.focus()}
  >
    <div class="fr-p-3w">
      {#if issued}
        <IssuedApiKey {issued} inDialog />
      {:else}
        {@render keyForm()}
      {/if}
    </div>
    {#snippet footer()}
      <button
        type="button"
        class="fr-btn fr-btn--secondary"
        class:ml-auto={issued}
        disabled={busy}
        onclick={closeCreation}
      >
        {issued ? "Terminer" : "Annuler"}
      </button>
      {#if !issued}{@render submitButton()}{/if}
    {/snippet}
  </Dialog>
{/if}
