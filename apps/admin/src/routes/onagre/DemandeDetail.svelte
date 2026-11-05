<script lang="ts">
  import type { PageData } from "./$types";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";

  let {
    dossier,
    onClose,
  }: {
    dossier: NonNullable<PageData["dossier"]>;
    onClose: () => void;
  } = $props();
  const tabs = ["Demande", "Dossier"];
  let selected = $state(0);
  let row = $derived(selected === 0 ? dossier.demande : dossier.projet);

  function switchTab(event: KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selected = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    document.querySelector<HTMLElement>(`#demande-detail-tab-${selected}`)?.focus();
  }
</script>

<WorkspaceDialog
  title={`Demande Onagre #${dossier.source_id}`}
  {onClose}
  triggerSelector={`[data-demande-trigger="${dossier.source_id}"]`}
>
  <div class="demande-detail">
    <div class="detail-tabs" role="tablist" aria-label="Détails de la demande Onagre">
      {#each tabs as label, index}
        <button
          type="button"
          role="tab"
          id={`demande-detail-tab-${index}`}
          aria-selected={selected === index}
          aria-controls="demande-detail-panel"
          tabindex={selected === index ? 0 : -1}
          onclick={() => (selected = index)}
          onkeydown={(event) => switchTab(event, index)}>{label}</button
        >
      {/each}
    </div>
    <div
      id="demande-detail-panel"
      role="tabpanel"
      aria-labelledby={`demande-detail-tab-${selected}`}
      tabindex="0"
    >
      <p class="onagre-context">
        {selected === 0
          ? "Valeurs de la demande dans le dump, avant toute transformation."
          : "Projet Onagre lié à cette demande. Aucun dossier Pitchou n'a encore été créé."}
      </p>
      <dl>
        {#each Object.entries(row) as [key, value]}
          <div>
            <dt>{key}</dt>
            <dd class:missing={value === null}>
              {value === null ? "Non renseigné" : value === "" ? '""' : value}
            </dd>
          </div>
        {:else}<p>Aucune donnée disponible dans le dump.</p>{/each}
      </dl>
    </div>
  </div>
</WorkspaceDialog>

<style>
  .demande-detail {
    padding: 0.5rem;
  }
  .detail-tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-default-grey);
    padding-bottom: 0.5rem;
  }
  .detail-tabs button {
    padding: 0.5rem;
    border-radius: 0.5rem;
  }
  .detail-tabs [aria-selected="true"] {
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
    font-weight: 600;
  }
  dl {
    margin: 0.5rem 0 0;
  }
  dl > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-default-grey);
  }
  dt {
    font-weight: 600;
  }
  dt,
  dd {
    overflow-wrap: anywhere;
  }
  dd {
    margin: 0;
    white-space: pre-wrap;
  }
  .missing {
    color: var(--text-mention-grey);
  }
  @media (max-width: 600px) {
    .demande-detail {
      padding: 0.5rem;
    }
    dl > div {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.25rem;
    }
  }
</style>
