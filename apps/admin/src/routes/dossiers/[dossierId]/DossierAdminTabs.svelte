<script lang="ts">
  let {
    current,
    simulation,
    onChange,
  }: {
    current: string;
    simulation: boolean;
    onChange: (tab: string) => void;
  } = $props();
  const tabs = $derived([
    { key: "dossier", label: "Dossier" },
    { key: "access", label: "Accès au dossier" },
    ...(simulation ? [{ key: "simulation", label: "Simulation" }] : []),
  ]);
  let list: HTMLDivElement;
  function move(event: KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].key);
    list.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
</script>

<div class="dossier-tabs" role="tablist" aria-label="Administration du dossier" bind:this={list}>
  {#each tabs as tab, index}
    <button
      type="button"
      role="tab"
      id={`dossier-tab-${tab.key}`}
      aria-selected={current === tab.key}
      aria-controls={`dossier-panel-${tab.key}`}
      tabindex={current === tab.key ? 0 : -1}
      onclick={() => onChange(tab.key)}
      onkeydown={(event) => move(event, index)}>{tab.label}</button
    >
  {/each}
</div>

<style>
  .dossier-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-default-grey);
  }
  button {
    padding: 0.75rem 1rem;
    color: var(--text-mention-grey);
    border-bottom: 3px solid transparent;
    font-weight: 600;
  }
  button[aria-selected="true"] {
    color: var(--text-action-high-blue-france);
    border-bottom-color: var(--border-action-high-blue-france);
  }
  @media (max-width: 575px) {
    button {
      padding: 0.75rem 0.5rem;
      font-size: 0.875rem;
    }
  }
</style>
