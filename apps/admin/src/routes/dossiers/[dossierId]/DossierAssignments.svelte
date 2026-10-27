<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import type { AssignmentMode, GroupAssignment } from "@pitchou/types/groupRouting.ts";
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
  $effect(() => {
    assignments = initial;
  });
  let saving = $state(false);
  let message = $state("");
  let selected = $state("");
  const visible = $derived(
    assignments.filter((group) => group.assigned || group.automatic || group.mode !== "auto"),
  );
  const available = $derived(assignments.filter((group) => !visible.includes(group)));
  async function save(groupId: string, mode: AssignmentMode) {
    saving = true;
    message = "";
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/affectations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId, mode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Affectation impossible");
      assignments = result;
      selected = "";
      await onChanged();
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Affectation impossible";
    } finally {
      saving = false;
    }
  }
</script>

<section class="admin-panel p-4" aria-label="Affectations aux groupes instructeurs">
  <h2>Affectations aux groupes instructeurs</h2>
  <p>
    Les ajouts manuels et les exclusions persistent après recalcul des règles. Plusieurs groupes
    peuvent recevoir ce dossier.
  </p>
  {#if message}<p class="fr-alert fr-alert--error" role="alert">{message}</p>{/if}
  <fieldset disabled={saving}>
    {#each visible as group (group.id)}
      <div class="mb-4 rounded-lg border border-[var(--border-default-grey)] p-3">
        <h3 class="text-base">{group.name}{group.active ? "" : " · Archivé"}</h3>
        <p>
          {group.assigned ? "Affecté" : "Non affecté"} · {group.mode === "include"
            ? "Ajout manuel"
            : group.mode === "exclude"
              ? "Exclusion manuelle"
              : "Règle automatique"}
        </p>
        {#if group.automatic}
          <p class="fr-hint-text">
            Correspondance automatique{group.departments.length
              ? ` · département principal ${group.departments.join(", ")}`
              : ""}
          </p>
          {#each group.rules as rule}
            <p class="fr-hint-text">
              Règle : {[
                rule.departments.length ? `départements ${rule.departments.join(", ")}` : "",
                rule.communes.length ? `communes INSEE ${rule.communes.join(", ")}` : "",
                rule.activites.length
                  ? `activités ${rule.activites.map((code) => activityLabels[code] ?? code).join(", ")}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ET ")}
            </p>
          {/each}
        {/if}
        {#if can("groups:manage")}
          <label class="fr-label" for={`assignment-${group.id}`}
            >Mode d'affectation de {group.name}</label
          >
          <select
            class="fr-select"
            id={`assignment-${group.id}`}
            value={group.mode}
            onchange={(event) => {
              const mode = event.currentTarget.value as AssignmentMode;
              event.currentTarget.value = group.mode;
              save(group.id, mode);
            }}
          >
            <option value="auto">Suivre les règles automatiques</option>
            <option value="include">Inclure manuellement</option>
            <option value="exclude">Exclure durablement</option>
          </select>
        {/if}
      </div>
    {:else}<p>Ce dossier n'est affecté à aucun groupe.</p>{/each}
    {#if can("groups:manage") && available.length}
      <label class="fr-label" for="assignment-new-group">Ajouter un groupe manuellement</label>
      <select class="fr-select" id="assignment-new-group" bind:value={selected}>
        <option value="">Choisir un groupe</option>
        {#each available as group}<option value={group.id}
            >{group.name}{group.active ? "" : " · Archivé"}</option
          >{/each}
      </select>
      <button
        class="fr-btn fr-btn--secondary mt-2"
        type="button"
        disabled={!selected}
        onclick={() => save(selected, "include")}>Affecter au groupe</button
      >
    {/if}
  </fieldset>
  {#if saving}<p role="status">Enregistrement…</p>{/if}
</section>
