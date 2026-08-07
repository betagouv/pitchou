<script lang="ts">
  import FilterAmongOptions from "./FilterAmongOptions.svelte";
  import SearchBar from "./SearchBar.svelte";
  import TagPhase from "$lib/components/TagPhase.svelte";
  import { NO_INSTRUCTEUR, type SuiviInstructionState } from "./suiviInstructionState.svelte.ts";
  type Props = { state: SuiviInstructionState };
  let { state }: Props = $props();
</script>

<SearchBar title="Rechercher par texte libre" updateTextSearch={(text) => state.search(text)} />
<div class="fr-mb-2w">
  <strong>Filtrer par phase</strong>{#each state.phaseOptions as phase}<TagPhase
      {phase}
      classes={["fr-mr-1w"]}
      onClick={() => state.togglePhase(phase)}
      ariaPressed={state.selectedPhases.has(phase)}
    />{/each}
</div>
<div class="flex items-center mb-2">
  <FilterAmongOptions
    title="Filtrer par activité principale"
    options={state.activityOptions}
    selectedOptions={state.selectedActivities}
    updateSelectedOptions={(values) => state.updateSet("activity", values)}
  />
  <FilterAmongOptions
    title="Filtrer par prochaine action attendue par"
    options={state.nextActionOptions}
    selectedOptions={state.selectedNextActions}
    updateSelectedOptions={(values) => state.updateSet("next", values)}
  />
  {#if state.instructeurOptions.size >= 2}<FilterAmongOptions
      title="Filtrer par instructeur suivant le dossier"
      options={state.instructeurOptions}
      selectedOptions={state.selectedInstructeurs}
      updateSelectedOptions={(values) => state.updateSet("instructeur", values)}
    />{/if}
</div>
<section class="fr-mb-1w">
  <div class="fr-mb-1w">
    <span>Dossiers suivis par&nbsp;:</span>
    {#if state.unselectedInstructeurs.size === 0}<strong>Toustes</strong
      >{:else if state.unselectedInstructeurs.size === 1 && state.unselectedInstructeurs.has(NO_INSTRUCTEUR)}<strong
        >Au moins un.e instructeur.rice</strong
      >{:else if state.unselectedInstructeurs.size <= 2}<strong>Toustes sauf</strong
      >{#each state.unselectedInstructeurs as value}<span
          class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v"
          >{value}{value === state.email ? " (moi)" : ""}</span
        >{/each}{:else}{#each state.selectedInstructeurs as value}<span
          class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v"
          >{value}{value === state.email ? " (moi)" : ""}</span
        >{/each}{/if}
    {#if state.selectedInstructeurs.size !== 1 || !state.selectedInstructeurs.has(state.email)}<button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-todo-line"
        onclick={() => state.onlyMine()}>Suivi par moi</button
      >{/if}
  </div>
  <div class="fr-mb-1w">
    <span>Prochaine action attendue par&nbsp;:</span>
    {#if state.unselectedNextActions.size === 0}<strong>Toutes options</strong
      >{:else}{#each state.unselectedNextActions.size <= 2 ? state.unselectedNextActions : state.selectedNextActions as value}<span
          class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">{value}</span
        >{/each}{/if}
  </div>
  <div class="fr-mb-1w">
    <span>Activités principales&nbsp;:</span>
    {#if state.unselectedActivities.size === 0}<strong>Toutes</strong
      >{:else}{#each state.unselectedActivities.size <= 4 ? state.unselectedActivities : state.selectedActivities as value}<span
          class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">{value}</span
        >{/each}{/if}
  </div>
  {#if state.text}<div class="fr-mb-1w">
      <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">Texte cherché : {state.text}</span><button
        onclick={(event) => state.clearText(event)}>✖</button
      >
    </div>{/if}
</section>
