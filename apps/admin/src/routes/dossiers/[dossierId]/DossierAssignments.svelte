<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import type {
    AccessLevel,
    AssignmentMode,
    GroupAssignment,
  } from "@pitchou/types/groupRouting.ts";
  import AssignmentRow from "./DossierAssignments/AssignmentRow.svelte";
  import AddAssignment from "./DossierAssignments/AddAssignment.svelte";

  let {
    dossierId,
    initial,
    onChanged,
    activityLabels = {},
  }: {
    dossierId: number;
    initial: GroupAssignment[];
    onChanged: () => Promise<void>;
    activityLabels?: Record<string, string>;
  } = $props();
  let assignments = $state<GroupAssignment[]>([]);
  let saving = $state(false);
  let adding = $state(false);
  $effect(() => {
    assignments = initial;
  });
  const visible = $derived(
    assignments
      .filter((group) => group.assigned || group.automatic || group.mode !== "auto")
      .sort((a, b) => Number(b.assigned) - Number(a.assigned)),
  );
  const available = $derived(assignments.filter((group) => !visible.includes(group)));

  async function save(groupId: string, mode: AssignmentMode, accessLevel: AccessLevel) {
    if (saving) return;
    saving = true;
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/affectations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId, mode, accessLevel }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Affectation impossible");
      await onChanged();
      assignments = result;
    } finally {
      saving = false;
    }
  }
</script>

<section class="access-section" aria-label="Affectations aux groupes instructeurs">
  <div class="access-section-header">
    <div>
      <h2>Groupes instructeurs</h2>
    </div>
    {#if can("groups:manage") && !adding && available.length}
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={saving}
        onclick={() => (adding = true)}>Ajouter un groupe</button
      >
    {/if}
  </div>
  <p class="access-description">
    Accès transmis par les groupes, selon leurs règles ou un ajout manuel.
  </p>
  <fieldset disabled={saving}>
    {#if can("groups:manage")}
      <AddAssignment
        groups={available}
        {saving}
        bind:open={adding}
        onSave={(id, level) => save(id, "include", level)}
      />
    {/if}
    <div class="access-list">
      {#each visible as group (group.id)}
        <AssignmentRow
          {group}
          {activityLabels}
          {saving}
          editable={can("groups:manage")}
          onSave={(mode, level) => save(group.id, mode, level)}
        />
      {:else}
        <p class="access-empty">Ce dossier n'est affecté à aucun groupe.</p>
      {/each}
    </div>
  </fieldset>
  {#if saving}<p role="status">Enregistrement…</p>{/if}
</section>

<style>
  fieldset {
    min-width: 0;
    border: 0;
    margin: 0;
    padding: 0;
  }
</style>
