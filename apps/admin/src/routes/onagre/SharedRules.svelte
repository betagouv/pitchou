<script lang="ts">
  import type { OnagreSharedRule } from "@pitchou/types/onagre.ts";
  import SharedRuleEditor from "./SharedRuleEditor.svelte";
  import { statusLabels } from "./mappings.ts";
  import "./sharedRules.css";
  let { rules, writable }: { rules: OnagreSharedRule[]; writable: boolean } = $props();
  let selected = $state<string | null>(null);
  let current = $derived(rules.find((rule) => rule.key === selected));
</script>

<section class="shared-rules admin-stack" aria-label="Règles communes de migration">
  <div class="shared-rules-intro admin-panel">
    <h2>Règles communes</h2>
    <p>
      Ces règles s'appliquent à plusieurs correspondances. Elles sont proposées pour la réunion et
      restent à valider. Leur enregistrement ne lance aucun import.
    </p>
    <p class="onagre-context">
      Brouillons préparés à partir des questions soulevées pendant la préparation. Ils ne
      constituent pas des décisions de l'équipe.
    </p>
  </div>
  <div class="shared-rules-grid">
    {#each rules as rule}
      <button
        type="button"
        class="shared-rule-card admin-panel"
        data-rule-key={rule.key}
        onclick={() => (selected = rule.key)}
      >
        <span class="shared-rule-heading"
          ><strong>{rule.title}</strong><span class="shared-rule-status" data-status={rule.status}
            >{statusLabels[rule.status]}</span
          ></span
        >
        <span>{rule.rule}</span>
        {#if rule.notes}<span class="shared-rule-question">{rule.notes}</span>{/if}
        <span class="shared-rule-open">{writable ? "Relire et modifier" : "Consulter"}</span>
      </button>
    {/each}
  </div>
</section>
{#if current}
  {#key current.key}<SharedRuleEditor
      rule={current}
      {writable}
      onClose={() => (selected = null)}
    />{/key}
{/if}
