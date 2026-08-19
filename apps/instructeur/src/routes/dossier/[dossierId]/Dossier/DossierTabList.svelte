<script lang="ts">
  import { visibleDossierTabs, type DossierTab } from "./dossierTabs.ts";
  import { readOnlyMode } from "./readOnly.ts";
  type Props = { activeTab: DossierTab; onSelect: (tab: DossierTab) => void };
  let { activeTab, onSelect }: Props = $props();

  const readOnly = readOnlyMode();
  const tabs = $derived(visibleDossierTabs(readOnly.current));
</script>

<ul class="fr-tabs__list" role="tablist" aria-label="Navigation des onglets du dossier">
  {#each tabs as tab}
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
        onclick={() => onSelect(tab.id)}
      >
        {tab.label}
      </button>
    </li>
  {/each}
</ul>
