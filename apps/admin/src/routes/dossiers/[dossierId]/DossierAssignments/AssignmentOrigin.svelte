<script lang="ts">
  import { departements } from "@pitchou/common/departements.ts";
  import type { GroupAssignment, GroupRule } from "@pitchou/types/groupRouting.ts";
  let {
    group,
    activityLabels,
  }: { group: GroupAssignment; activityLabels: Record<string, string> } = $props();
  const departmentNames = new Map(
    departements.map(({ code, name }) => [code, `${code} · ${name}`]),
  );
  const rules = $derived<GroupRule[]>([
    ...(group.departments.length > 0
      ? [
          {
            departments: group.departments,
            communes: [],
            activites: [],
            accessLevel: "instruct" as const,
          },
        ]
      : []),
    ...group.rules,
  ]);
</script>

<details class="assignment-origin">
  <summary>
    <span class="fr-icon-information-line" aria-hidden="true"></span>
    Détails de l'affectation
    <span class="chevron fr-icon-arrow-down-s-line" aria-hidden="true"></span>
  </summary>
  <div class="origin-content">
    {#if !group.active}
      <p>Ce groupe est archivé et ne donne aucun accès au dossier.</p>
    {:else if group.mode === "include"}
      <p>
        L'accès <strong
          >{group.manualAccessLevel === "read" ? "Lecture complète" : "Instruction"}</strong
        > est accordé manuellement. Ce choix remplace le niveau prévu par les règles ci-dessous.
      </p>
    {:else if group.mode === "exclude"}
      <p>L'exclusion manuelle bloque l'accès de ce groupe, même si une règle correspond.</p>
    {:else}
      <p>Ce dossier correspond aux critères du groupe.</p>
    {/if}
    {#each rules as rule, index}
      <div class="matching-rule">
        <div class="rule-heading">
          <strong>Règle correspondante{rules.length > 1 ? ` ${index + 1}` : ""}</strong>
          <span class="access-badge"
            >{rule.accessLevel === "read" ? "Lecture complète" : "Instruction"}</span
          >
        </div>
        <dl>
          {#if rule.departments.length}
            <div>
              <dt>Département principal</dt>
              <dd>
                {rule.departments.map((code) => departmentNames.get(code) ?? code).join(", ")}
              </dd>
            </div>
          {/if}
          {#if rule.communes.length}
            <div>
              <dt>Commune du projet</dt>
              <dd>{rule.communes.join(", ")} <span class="code-hint">· codes INSEE</span></dd>
            </div>
          {/if}
          {#if rule.activites.length}
            <div>
              <dt>Activité principale</dt>
              <dd>{rule.activites.map((code) => activityLabels[code] ?? code).join(", ")}</dd>
            </div>
          {/if}
        </dl>
      </div>
    {/each}
  </div>
</details>

<style>
  .assignment-origin {
    margin-top: 0.75rem;
    border-top: 1px solid var(--border-default-grey);
  }
  summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0 0;
    color: var(--text-action-high-blue-france);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary :global([class*="fr-icon-"]::before) {
    --icon-size: 1rem;
  }
  .chevron {
    margin-left: auto;
    transition: transform 0.15s;
  }
  details[open] .chevron {
    transform: rotate(180deg);
  }
  .origin-content {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding: 0.875rem;
    background: var(--background-alt-grey);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    line-height: 1.6;
  }
  p,
  dl,
  dd {
    margin: 0;
  }
  p,
  dt,
  .code-hint {
    color: var(--text-mention-grey);
  }
  .matching-rule + .matching-rule {
    border-top: 1px solid var(--border-default-grey);
    padding-top: 0.75rem;
  }
  .rule-heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }
  dl {
    display: grid;
    gap: 0.5rem;
  }
  dd {
    font-weight: 500;
    overflow-wrap: anywhere;
  }
</style>
