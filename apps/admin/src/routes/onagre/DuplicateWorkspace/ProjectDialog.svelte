<script lang="ts">
  import { beforeNavigate, goto } from "$app/navigation";
  import type {
    DuplicateReview,
    DuplicateDecision,
    DuplicateRevision,
  } from "@pitchou/types/onagreDuplicates.ts";
  import WorkspaceDialog from "../WorkspaceDialog.svelte";
  import ProjectReview from "./ProjectReview.svelte";
  let {
    project,
    decisions,
    revisions,
    writable,
    onClose,
  }: {
    project: DuplicateReview;
    decisions: Map<string, DuplicateDecision>;
    revisions: DuplicateRevision[];
    writable: boolean;
    onClose: () => void;
  } = $props();
  let content: HTMLDivElement;
  let pending = $state<(() => void) | null>(null);
  let bypass = false;
  const busy = () => Boolean(content?.querySelector('form[data-duplicate-busy="true"]'));
  const dirty = () => Boolean(content?.querySelector('form[data-duplicate-dirty="true"]'));
  function close() {
    if (busy()) return false;
    if (dirty()) {
      pending = onClose;
      return false;
    }
    onClose();
  }
  beforeNavigate((navigation) => {
    if (bypass || (!dirty() && !busy())) return;
    navigation.cancel();
    if (!navigation.willUnload && navigation.to && !busy()) {
      const href = navigation.to.url.href;
      pending = () => void goto(href);
    }
  });
</script>

<WorkspaceDialog title={`Projet Onagre ${project.project_id}`} size="xlarge" onClose={close}>
  <div class="duplicate-detail" bind:this={content}>
    <ProjectReview {project} {decisions} {revisions} {writable} />
  </div>
  {#snippet footer()}
    {#if pending}
      <p>Des décisions ne sont pas enregistrées.</p>
      <button class="fr-btn fr-btn--secondary" onclick={() => (pending = null)}
        >Continuer la saisie</button
      >
      <button
        class="fr-btn"
        onclick={() => {
          if (busy()) return;
          bypass = true;
          pending?.();
        }}>Abandonner les modifications</button
      >
    {:else}<button class="fr-btn fr-btn--secondary" onclick={close}>Fermer</button>{/if}
  {/snippet}
</WorkspaceDialog>
