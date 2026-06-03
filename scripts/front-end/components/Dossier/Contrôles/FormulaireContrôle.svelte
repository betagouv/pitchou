<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (bouton-valider to bouton_valider) making the component unusable -->
<script lang="ts">
  import { untrack } from "svelte";
  import DateInput from "../../common/DateInput.svelte";

  import toJSONPerserveDate from "../../../../commun/DateToJSON.js";
  import { résultatsContrôle, typesActionSuiteContrôle } from "../../../actions/contrôle.ts";

  import type { Snippet } from "svelte";
  import type Contrôle from "../../../../types/database/public/Contrôle.ts";

  type Props = {
    contrôle: Contrôle | Partial<Contrôle>;
    onValider: (contrôle: Contrôle | Partial<Contrôle>) => Promise<any>;
    boutonValider?: Snippet;
    boutonAnnuler?: Snippet;
    boutonSupprimer?: Snippet;
  };

  let { contrôle, onValider, boutonValider, boutonAnnuler, boutonSupprimer }: Props = $props();

  let contrôleEnÉdition: Props["contrôle"] = $state(untrack(() => contrôle));

  async function formSubmit(e: Event) {
    e.preventDefault();

    if (contrôleEnÉdition.date_action_suite_contrôle) {
      Object.defineProperty(contrôleEnÉdition.date_action_suite_contrôle, "toJSON", {
        value: toJSONPerserveDate,
      });
    }
    if (contrôleEnÉdition.date_prochaine_échéance) {
      Object.defineProperty(contrôleEnÉdition.date_prochaine_échéance, "toJSON", {
        value: toJSONPerserveDate,
      });
    }

    onValider(contrôleEnÉdition);
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date du contrôle </label>
    <DateInput bind:date={contrôleEnÉdition.date_contrôle}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Résultat </label>
    <input class="fr-input" list="résultats-contrôle" bind:value={contrôleEnÉdition.résultat} />
    <datalist id="résultats-contrôle">
      {#each résultatsContrôle as résultatContrôle}
        <option>{résultatContrôle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Commentaire libre </label>
    <textarea class="fr-input" bind:value={contrôleEnÉdition.commentaire}></textarea>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Action suite au contrôle </label>
    <input
      class="fr-input"
      list="type-actions"
      bind:value={contrôleEnÉdition.type_action_suite_contrôle}
    />
    <datalist id="type-actions">
      {#each typesActionSuiteContrôle as typeActionSuiteContrôle}
        <option>{typeActionSuiteContrôle}</option>
      {/each}
    </datalist>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date de l'action suite au contrôle </label>
    <DateInput bind:date={contrôleEnÉdition.date_action_suite_contrôle}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="text-input"> Date prochaine échéance </label>
    <DateInput bind:date={contrôleEnÉdition.date_prochaine_échéance}></DateInput>
  </div>

  <div class="fr-mb-6w">
    {#if boutonValider}
      {@render boutonValider()}
    {:else}
      <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
        Enregistrer
      </button>
    {/if}

    {@render boutonAnnuler?.()}
  </div>

  {#if boutonSupprimer}
    {@render boutonSupprimer()}
  {/if}
</form>

<style lang="scss">
  form {
    margin-top: 1rem;
    margin-bottom: 2rem;
  }
</style>
