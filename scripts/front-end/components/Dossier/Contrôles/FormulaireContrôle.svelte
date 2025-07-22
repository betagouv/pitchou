<script>
    import DateInput from '../../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../../commun/DateToJSON.js';
    import {résultatsContrôle, typesActionSuiteContrôle} from '../../../actions/contrôle.js'


    /** @import Contrôle from '../../../../types/database/public/Contrôle.ts' */


    /** @type {Contrôle | Partial<Contrôle>} */
    export let contrôle

    /** @type {(contrôle: Contrôle | Partial<Contrôle>) => Promise<any>} */
    export let onValider

    /**
     * 
     * @param {Event} e
     */
    async function formSubmit(e){
        e.preventDefault()

        if(contrôle.date_action_suite_contrôle){
            Object.defineProperty(contrôle.date_action_suite_contrôle, 'toJSON', {value: toJSONPerserveDate})
        }
        if(contrôle.date_prochaine_échéance){
            Object.defineProperty(contrôle.date_prochaine_échéance, 'toJSON', {value: toJSONPerserveDate})
        }

        onValider(contrôle)
    }


</script>



<form on:submit={formSubmit}>
    <div class="fr-input-group">
        <label class="fr-label" for="text-input">
            Date du contrôle
        </label>
        <DateInput bind:date={contrôle.date_contrôle}></DateInput>
    </div>


    <div class="fr-input-group">
        <label class="fr-label" for="text-input"> Résultat </label>
        <input
            class="fr-input"
            list="résultats-contrôle"
            bind:value={contrôle.résultat}
        />
        <datalist id="résultats-contrôle">
            {#each résultatsContrôle as résultatContrôle}
                <option>{résultatContrôle}</option>
            {/each}
        </datalist>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="text-input"> Commentaire libre </label>
        <textarea class="fr-input" bind:value={contrôle.commentaire}
        ></textarea>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="text-input">
            Action suite au contrôle
        </label>
        <input
            class="fr-input"
            list="type-actions"
            bind:value={contrôle.type_action_suite_contrôle}
        />
        <datalist id="type-actions">
            {#each typesActionSuiteContrôle as typeActionSuiteContrôle}
                <option>{typeActionSuiteContrôle}</option>
            {/each}
        </datalist>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="text-input">
            Date de l'action suite au contrôle
        </label>
        <DateInput bind:date={contrôle.date_action_suite_contrôle}></DateInput>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="text-input">
            Date prochaine échéance
        </label>
        <DateInput bind:date={contrôle.date_prochaine_échéance}></DateInput>
    </div>

    <slot name="bouton-valider">
        <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
            Enregistrer
        </button>
    </slot>

    <slot name="bouton-annuler" />

    <slot name="bouton-supprimer"/>

</form>


<style lang="scss">
    form{
        margin-top: 1rem;
        margin-bottom: 2rem;
    }


</style>