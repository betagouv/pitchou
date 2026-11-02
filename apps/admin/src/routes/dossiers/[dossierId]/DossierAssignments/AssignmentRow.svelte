<script lang="ts">
  import type {
    AccessLevel,
    AssignmentMode,
    GroupAssignment,
  } from "@pitchou/types/groupRouting.ts";
  import AssignmentEditor from "./AssignmentEditor.svelte";

  let {
    group,
    activityLabels,
    saving,
    editable,
    onSave,
  }: {
    group: GroupAssignment;
    activityLabels: Record<string, string>;
    saving: boolean;
    editable: boolean;
    onSave: (mode: AssignmentMode, level: AccessLevel) => Promise<void>;
  } = $props();
  let editing = $state(false);
</script>

<article class="access-row" aria-label={group.name}>
  <div class="access-row-heading">
    <h3>{group.name}</h3>
    <span class={group.assigned ? "access-badge" : "access-badge access-badge-muted"}>
      {group.assigned && group.accessLevel
        ? group.accessLevel === "instruct"
          ? "Instruction"
          : "Lecture complète"
        : "Aucun accès"}
    </span>
    {#if editable && !editing}
      <button
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
        type="button"
        aria-label={`Modifier l'affectation de ${group.name}`}
        onclick={() => (editing = true)}>Modifier</button
      >
    {/if}
  </div>
  <p class="access-meta">
    {group.mode === "include"
      ? "Ajout manuel"
      : group.mode === "exclude"
        ? "Exclusion manuelle"
        : "Règle automatique"}
    {#if !group.active}<span class="access-badge access-badge-muted">Archivé</span>{/if}
    {#if group.mode === "exclude"}<span class="access-badge access-badge-muted">Exclu</span>{/if}
  </p>
  {#if group.automatic || group.rules.length}
    <details class="access-details">
      <summary>Voir les règles du groupe</summary>
      {#if group.automatic}
        <p>
          Correspondance automatique{group.departments.length
            ? ` · département principal ${group.departments.join(", ")}`
            : ""}
        </p>
      {:else}
        <p>Aucune correspondance automatique pour ce dossier.</p>
      {/if}
      {#each group.rules as rule}
        <p>
          Règle · {rule.accessLevel === "read" ? "Lecture complète" : "Instruction"} : {[
            rule.departments.length ? `départements ${rule.departments.join(", ")}` : "",
            rule.communes.length ? `communes INSEE ${rule.communes.join(", ")}` : "",
            rule.activites.length
              ? `activités ${rule.activites.map((code) => activityLabels[code] ?? code).join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" ET ") || "Aucun critère"}
        </p>
      {/each}
    </details>
  {/if}
  {#if editing && editable}
    <AssignmentEditor {group} {saving} {onSave} onCancel={() => (editing = false)} />
  {/if}
</article>
