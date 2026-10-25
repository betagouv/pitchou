<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import type { ActivityOption } from "@pitchou/types/onagreActivities.ts";
  import type { DecisionDraft } from "./MappingEditor/decision.svelte.ts";
  let {
    activities,
    draft,
    disabled,
  }: { activities: ActivityOption[]; draft: DecisionDraft; disabled: boolean } = $props();
  let search = $state("");
  let options = $derived(
    activities
      .filter(
        (activity) =>
          activity.code === draft.activityCode ||
          `${activity.label} ${activity.code}`
            .toLocaleLowerCase("fr")
            .includes(search.toLocaleLowerCase("fr")),
      )
      .map((activity) => ({ value: activity.code, label: activity.label, hint: activity.code })),
  );
</script>

<div class="onagre-field">
  <label for="activity-search">Rechercher une activité Pitchou</label>
  <input
    id="activity-search"
    class="fr-input"
    placeholder="Libellé ou code de l'activité…"
    bind:value={search}
    {disabled}
  />
  <label for="mapping-activity">Activité dans Pitchou</label>
  <Select
    id="mapping-activity"
    {disabled}
    value={draft.activityCode}
    onChange={(value) => draft.chooseActivity(value)}
    options={[
      { value: "", label: "Aucune activité choisie" },
      ...options,
      ...(draft.activityCode && !activities.some((activity) => activity.code === draft.activityCode)
        ? [{ value: draft.activityCode, label: `${draft.activityCode} · indisponible` }]
        : []),
    ]}
  />
  <input type="hidden" name="activity_code" value={draft.activityCode} /><input
    type="hidden"
    name="target"
    value={draft.target}
  />
  {#if draft.suggested}<p class="onagre-context">
      Suggestion issue de la règle ou de la proposition existante. À confirmer avant validation.
    </p>{/if}
  <p class="onagre-context">
    La décision est partagée avec l'onglet Correspondances. Elle ne modifie pas encore les dossiers.
  </p>
</div>
