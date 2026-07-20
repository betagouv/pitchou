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

    if (editedControle.post_controle_action_date) {
      Object.defineProperty(editedControle.post_controle_action_date, "toJSON", {
        value: toJSONPerserveDate,
      });
    }
    if (editedControle.next_due_date) {
      Object.defineProperty(editedControle.next_due_date, "toJSON", {
        value: toJSONPerserveDate,
      });
    }

    onValidate(editedControle);
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date du contrôle </label>
    <DateInput bind:date={editedControle.controle_date}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Résultat </label>
    <input class="fr-input" list="résultats-contrôle" bind:value={editedControle.result} />
    <datalist id="résultats-contrôle">
      {#each resultatsControle as resultatControle}
        <option>{resultatControle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Commentaire libre </label>
    <textarea class="fr-input" bind:value={editedControle.comment}></textarea>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Action suite au contrôle </label>
    <input
      class="fr-input"
      list="type-actions"
      bind:value={editedControle.post_controle_action_type}
    />
    <datalist id="type-actions">
      {#each typesActionSuiteControle as typeActionSuiteControle}
        <option>{typeActionSuiteControle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date de l'action suite au contrôle </label>
    <DateInput bind:date={editedControle.post_controle_action_date}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date prochaine échéance </label>
    <DateInput bind:date={editedControle.next_due_date}></DateInput>
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
