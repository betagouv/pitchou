<script>
    import DateInput from '../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../commun/DateToJSON.js';
    import {formatDateRelative} from '../../affichageDossier.js'
    import {ajouterContrôle as envoyerContrôle, résultatsContrôle, typesActionSuiteContrôle} from '../../actions/contrôle.js'

    /** @import Prescription from '../../../types/database/public/Prescription.ts' */
    /** @import Contrôle from '../../../types/database/public/Contrôle.ts' */

    /** @type {Partial<Prescription>} */
    export let prescription

    let {
        id, description, date_échéance, numéro_article,
        surface_évitée, surface_compensée, individus_évités, individus_compensés, nids_évités, nids_compensés,
        contrôles: _contrôles
    } = prescription

    /** @type {Set<Partial<Contrôle>>}*/
    $: contrôles = _contrôles ? new Set(_contrôles) : new Set()

    const NON_RENSEIGNÉ = '(non renseigné)'

    function rerender(){
        contrôles = contrôles
    }


    let contrôlesOuverts = false

    function ouvrirContrôles(){
        contrôlesOuverts = true;

        rerender()
    }

    function fermerContrôles(){
        contrôlesOuverts = false;

        rerender()
    }

    /** @type {Partial<Contrôle> | undefined} */
    let contrôleEnCours;

    function ajouterContrôle(){
        /** @type {Contrôle} */
        contrôleEnCours = {
            prescription: id,
            date_contrôle: new Date(),
            résultat: null,
            commentaire: null,
            type_action_suite_contrôle: null,
            date_action_suite_contrôle: null,
            date_prochaine_échéance: null
        }

        rerender()
    }

    /**
     * 
     * @param {Event} e
     */
    async function formSubmit(e){
        e.preventDefault()

        if(contrôleEnCours){
            contrôles.add(contrôleEnCours)

            if(contrôleEnCours.date_contrôle){
                Object.defineProperty(contrôleEnCours.date_contrôle, 'toJSON', {value: toJSONPerserveDate})
            }
            if(contrôleEnCours.date_action_suite_contrôle){
                Object.defineProperty(contrôleEnCours.date_action_suite_contrôle, 'toJSON', {value: toJSONPerserveDate})
            }
            if(contrôleEnCours.date_prochaine_échéance){
                Object.defineProperty(contrôleEnCours.date_prochaine_échéance, 'toJSON', {value: toJSONPerserveDate})
            }

            await envoyerContrôle(contrôleEnCours)
            contrôleEnCours = undefined;
        }

    }

</script>

<section class="prescription-consultée">
    <h6>
        {description} 
        {#if numéro_article}
        - 
        <small><strong>Numéro article&nbsp;:&nbsp;</strong>
            {numéro_article}
        </small>
        {/if}
    </h6>
    <p></p>
    <p><strong>Date d'échéance&nbsp;:</strong>
        {#if date_échéance}
            <time datetime={date_échéance?.toISOString()}>{formatDateRelative(date_échéance)}</time>
        {:else}
            {NON_RENSEIGNÉ}
        {/if}
    </p>
    {#if surface_évitée || surface_compensée || 
        individus_évités || surface_compensée || 
        nids_évités || nids_compensés}
        <p class="impacts-quantifiés">
            {#if surface_évitée}<span><strong>Surface évitée&nbsp;:</strong> {surface_évitée}m²</span>{/if}
            {#if surface_compensée}<span><strong>Surface compensée&nbsp;:</strong> {surface_compensée}m²</span>{/if}
            {#if individus_évités}<span><strong>Individus évités&nbsp;:</strong> {individus_évités}</span>{/if}
            {#if individus_compensés}<span><strong>Individus compensés&nbsp;:</strong> {individus_compensés}</span>{/if}
            {#if nids_évités}<span><strong>Nids évités&nbsp;:</strong> {nids_évités}</span>{/if}
            {#if nids_compensés}<span><strong>Nids compensés&nbsp;:</strong> {nids_compensés}</span>{/if}
        </p>
    {/if}

    {#if contrôlesOuverts}
    <button class="contrôles fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-survey-line" 
        on:click={() => fermerContrôles()}>
        Fermer contrôles
    </button>
    {:else}
    <button class="contrôles fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-survey-line" 
        on:click={() => ouvrirContrôles()}>
        Ouvrir contrôles
    </button>
    {/if}

    {#if contrôlesOuverts}
        <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterContrôle}>
            Ajouter un contrôle
        </button>

        {#if contrôleEnCours}
            <form on:submit={formSubmit}>
                <div class="fr-input-group">
                    <label class="fr-label" for="text-input">
                        Résultat
                    </label>
                    <input class="fr-input" list="résultats-contrôle" bind:value={contrôleEnCours.résultat}>
                    <datalist id="résultats-contrôle">
                        {#each résultatsContrôle as résultatContrôle}
                            <option>{résultatContrôle}</option>
                        {/each}
                    </datalist>
                </div>

                <div class="fr-input-group">
                    <label class="fr-label" for="text-input">
                        Commentaire libre
                    </label>
                    <textarea class="fr-input" bind:value={contrôleEnCours.commentaire}></textarea>
                </div>


                <div class="fr-input-group">
                    <label class="fr-label" for="text-input">
                        Action suite au contrôle
                    </label>
                    <input class="fr-input" list="type-actions" bind:value={contrôleEnCours.type_action_suite_contrôle}>
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
                    <DateInput bind:date={contrôleEnCours.date_action_suite_contrôle}></DateInput>
                </div>

                <div class="fr-input-group">
                    <label class="fr-label" for="text-input">
                        Date prochaine échéance
                    </label>
                    <DateInput bind:date={contrôleEnCours.date_prochaine_échéance}></DateInput>
                </div>

                <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
                    Finir le contrôle
                </button>

                <button type="button" class="fr-btn fr-btn--secondary" on:click={() => contrôleEnCours = undefined}>
                    Fermer le contrôle sans sauvegarder
                </button>
            </form>
        {/if}

    {/if}

</section>

<style lang="scss">

.prescription-consultée{
    --prescription-padding-top: 0.5rem;

    padding: var(--prescription-padding-top);
    margin-bottom: var(--prescription-padding-top);

    &:hover{
        background-color: var(--background-contrast-grey);
    }

    h6, p{
        margin-bottom: 0.4rem;
    }

    .impacts-quantifiés{
        span{
            display: inline-block;
            white-space: wrap;

            &::after{
                content: '|';
                padding: 0 1rem;
            }

            &:first-child{
                padding-left: 0;
            }

            &:last-child{
                &::after{
                    content: none;
                }
            }
        }
    }


    position: relative;

    button.contrôles{
        position: absolute;
        top: var(--prescription-padding-top);
        right: var(--prescription-padding-top);
    }
}


</style>