<script lang="ts">
  import { visibleDossierTabs, type DossierTab } from "./dossierTabs.ts";
  import { readOnlyMode } from "./readOnly.ts";
  type Props = {
    activeTab: DossierTab;
    onSelect: (tab: DossierTab) => void;
    hasPendingChanges?: boolean;
  };
  let { activeTab, onSelect, hasPendingChanges = false }: Props = $props();

  const readOnly = readOnlyMode();
  const tabs = $derived(visibleDossierTabs(readOnly.current));
</script>

<ul class="fr-tabs__list" role="tablist" aria-label="Navigation des onglets du dossier">
  {#each tabs as tab}
    {@const pending = tab.id === "detail-du-projet" && hasPendingChanges && !readOnly.current}
    <li role="presentation">
      <button
        type="button"
        id="tabpanel-{tab.id}"
        aria-controls="tabpanel-{tab.id}-panel"
        class="fr-tabs__tab {tab.icon} fr-tabs__tab--icon-left {activeTab === tab.id
          ? 'fr-tabs__tab--selected'
          : ''}"
        tabindex={activeTab === tab.id ? 0 : -1}
        role="tab"
        aria-selected={activeTab === tab.id}
        aria-describedby={pending ? `tabpanel-${tab.id}-pending` : undefined}
        onclick={() => onSelect(tab.id)}
      >
        {tab.label}
        {#if pending}<span class="pending-dot" aria-hidden="true"></span>{/if}
      </button>
      {#if pending}
        <span id="tabpanel-{tab.id}-pending" class="fr-sr-only">Modifications non lues</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .fr-tabs__list {
    padding-bottom: 0;
    margin-bottom: 0;
    gap: 8px;
  }

  .fr-tabs__list > li {
    margin: 0;
    padding: 0;
    flex-shrink: 0;
  }

  .fr-tabs__tab {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5rem;
    font-weight: 500;
    border-radius: 4px 4px 0 0;
    background-color: var(--background-contrast-grey);
    background-image: none;
    box-shadow: none;
    color: var(--text-default-grey);
  }

  .fr-tabs__tab[aria-selected="false"] {
    --hover: var(--background-contrast-grey-hover);
    --active: var(--background-contrast-grey-active);
    background-color: var(--background-contrast-grey);
  }

  .fr-tabs__tab[aria-selected="true"] {
    background-color: var(--background-default-grey);
    background-image: none;
    box-shadow: none;
    color: var(--text-active-blue-france);
  }

  .pending-dot {
    align-self: flex-start;
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    margin-inline-start: 8px;
    border-radius: 50%;
    background: #efcb3a;
  }
</style>
