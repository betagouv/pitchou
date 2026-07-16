<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (bouton-valider to bouton_valider) making the component unusable -->
<script lang="ts">
  import { untrack } from "svelte";
  import DateInput from "../../DateInput.svelte";

  import toJSONPerserveDate from "@pitchou/common/DateToJSON.ts";
  import { resultatsControle, typesActionSuiteControle } from "./controle.ts";

  import type { Snippet } from "svelte";
  import type Controle from "@pitchou/types/database/public/Controle.ts";

  type Props = {
    controle: Controle | Partial<Controle>;
    onValidate: (controle: Controle | Partial<Controle>) => Promise<any>;
    buttonValidate?: Snippet;
    buttonCancel?: Snippet;
    buttonDelete?: Snippet;
  };

  let { controle, onValidate, buttonValidate, buttonCancel, buttonDelete }: Props = $props();

  let editedControle: Props["controle"] = $state(untrack(() => controle));

  async function formSubmit(e: Event) {
    e.preventDefault();

    if (editedControle.date_action_suite_contrôle) {
      Object.defineProperty(editedControle.date_action_suite_contrôle, "toJSON", {
        value: toJSONPerserveDate,
      });
    }
    if (editedControle.date_prochaine_échéance) {
      Object.defineProperty(editedControle.date_prochaine_échéance, "toJSON", {
        value: toJSONPerserveDate,
      });
    }

    onValidate(editedControle);
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date du contrôle </label>
    <DateInput bind:date={editedControle.date_contrôle}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Résultat </label>
    <input class="fr-input" list="résultats-contrôle" bind:value={editedControle.résultat} />
    <datalist id="résultats-contrôle">
      {#each resultatsControle as resultatControle}
        <option>{resultatControle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Commentaire libre </label>
    <textarea class="fr-input" bind:value={editedControle.commentaire}></textarea>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Action suite au contrôle </label>
    <input
      class="fr-input"
      list="type-actions"
      bind:value={editedControle.type_action_suite_contrôle}
    />
    <datalist id="type-actions">
      {#each typesActionSuiteControle as typeActionSuiteControle}
        <option>{typeActionSuiteControle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date de l'action suite au contrôle </label>
    <DateInput bind:date={editedControle.date_action_suite_contrôle}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date prochaine échéance </label>
    <DateInput bind:date={editedControle.date_prochaine_échéance}></DateInput>
  </div>

  <div class="fr-mb-6w">
    {#if buttonValidate}
      {@render buttonValidate()}
    {:else}
      <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
        Enregistrer
      </button>
    {/if}

    {@render buttonCancel?.()}
  </div>

  {#if buttonDelete}
    {@render buttonDelete()}
  {/if}
</form>

<style lang="scss">
  form {
    margin-top: 1rem;
    margin-bottom: 2rem;
  }
</style>
