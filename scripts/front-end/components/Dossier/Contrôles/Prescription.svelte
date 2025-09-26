<script>
    import {SvelteSet} from 'svelte/reactivity'
    import FormulaireContrôle from './FormulaireContrôle.svelte'
    import DéplierReplier from '../../common/DéplierReplier.svelte'
    import TagRésultatContrôle from '../../TagRésultatContrôle.svelte'

    import {formatDateRelative, formatDateAbsolue} from '../../../affichageDossier.js'
    import {ajouterContrôle as envoyerContrôle, modifierContrôle, supprimerContrôle} from '../../../actions/contrôle.js'

    /** @import {FrontEndPrescription} from '../../../../types/API_Pitchou.ts' */
    /** @import Contrôle from '../../../../types/database/public/Contrôle.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {Partial<FrontEndPrescription>} prescription
     */

    /** @type {Props} */
    let { prescription } = $props();

    let {
        id, description, date_échéance, numéro_article,
        surface_évitée, surface_compensée, individus_évités, individus_compensés, nids_évités, nids_compensés
    } = $derived(prescription)

    /** @type {Set<Partial<Contrôle>>}*/
    let contrôles = $derived(prescription.contrôles ? new SvelteSet(prescription.contrôles) : new SvelteSet())

    $inspect('contrôles', contrôles)

    const NON_RENSEIGNÉ = '(non renseigné)'

    let contrôlesTriés = $derived([...contrôles].toSorted(
        ({date_contrôle: dc1}, {date_contrôle: dc2}) => (dc2?.getTime() || 0) - (dc1?.getTime() || 0)
    ))

    let contrôlesOuverts = $state(false)

    function ouvrirContrôles(){
        contrôlesOuverts = true;
    }

    function fermerContrôles(){
        contrôlesOuverts = false;
    }

    /** @type {Partial<Contrôle> | undefined} */
    let contrôleEnCours = $state(); 

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
    }

    async function créerContrôle(){
        if(contrôleEnCours){
            contrôles.add(contrôleEnCours)

            const contrôleId = await envoyerContrôle(contrôleEnCours)
            if(!contrôleId){
                throw new Error(`contrôleId absent de la valeur de retour de 'envoyerContrôle'`)
            }

            contrôleEnCours.id = contrôleId

            contrôleEnCours = undefined;
        }
    }

    // ne pas créer de proxy pour pouvoir faire des comparaisons ===
    // https://svelte.dev/docs/svelte/runtime-warnings#Client-warnings-state_proxy_equality_mismatch
    /** @type {Partial<Contrôle> | undefined}*/
    let contrôleEnModification = $state.raw();

    /** 
     * @param {Partial<Contrôle>} contrôle
     */
    function passerContrôleEnModification(contrôle) {
        contrôleEnModification = contrôle
    }

    /** 
     * @param {Partial<Contrôle>} contrôleValidé
     */
    async function validerModificationsContrôle(contrôleValidé){
        if(!contrôleEnModification)
            throw new TypeError(`pas de contrôle en modificaion`)

        // remplacer contrôleEnModification par contrôleValidé dans le tableau des contrôles
        // @ts-ignore
        const index = prescription.contrôles?.indexOf(contrôleEnModification) || -1;
        if (index !== -1) { 
            prescription.contrôles?.splice(index, 1); 
        }
        contrôleEnModification = undefined

        // @ts-ignore
        prescription.contrôles?.push(contrôleValidé)
            
        console.log('validerModificationsContrôle contrôleValidé', contrôleValidé)
            
        await modifierContrôle(contrôleValidé)
        
    }

    async function supprimerContrôleEnModification(){
        if(!contrôleEnModification)
            throw new TypeError(`pas de contrôle en modificaion`)

        contrôles.delete(contrôleEnModification)

        const id = contrôleEnModification.id
        contrôleEnModification = undefined

        if(!id){
            throw new TypeError(`il manque un id au contrôle en modificaion`)
        }
        
        await supprimerContrôle(id)
    }

</script>

<section class="prescription-consultée">
    <DéplierReplier>
        {#snippet summary()}
                <h6 >
                {#if description}
                    {description}
                {:else if numéro_article}
                    Numéro article&nbsp;:&nbsp;{numéro_article}
                {:else}
                    (Prescription non renseignée)
                {/if}
            </h6>
        {/snippet}
        {#snippet content()}
                <section >
                {#if numéro_article}
                <p><strong>Numéro article&nbsp;:&nbsp;</strong>{numéro_article}</p>
                {/if}
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
                <button class="contrôles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-survey-line" 
                    onclick={() => fermerContrôles()}>
                    Fermer contrôles
                </button>
                {:else}
                <button class="contrôles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-survey-line" 
                    onclick={() => ouvrirContrôles()}>
                    Ouvrir contrôles
                </button>
                {/if}

                {#if contrôlesOuverts}
                    <section class="contrôles">
                        <h6>{#if contrôles.size === 1}1 contrôle{:else}{contrôles.size} contrôles {/if}</h6>

                        <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={ajouterContrôle}>
                            Ajouter un contrôle
                        </button>

                        {#if contrôleEnCours}
                            <FormulaireContrôle contrôle={contrôleEnCours} onValider={créerContrôle}>
                                {#snippet boutonValider()}
                                    <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
                                        Finir le contrôle
                                    </button>
                                {/snippet}
                                {#snippet boutonAnnuler()}
                                    <button
                                        type="button"
                                        class="fr-btn fr-btn--secondary"
                                        onclick={() => (contrôleEnCours = undefined)}
                                    >
                                        Fermer le contrôle sans sauvegarder
                                    </button>
                                {/snippet}
                            </FormulaireContrôle>
                        {/if}

                        {#each contrôlesTriés as contrôle}
                            {#if contrôle === contrôleEnModification}
                                <h6>Modification du contrôle</h6>

                                <FormulaireContrôle contrôle={contrôleEnModification} onValider={validerModificationsContrôle}>
                                    {#snippet boutonAnnuler()}
                                        <button type="button" class="fr-btn fr-btn--secondary" onclick={() => (contrôleEnModification = undefined)}>
                                            Annuler
                                        </button>
                                    {/snippet}
                                    {#snippet boutonSupprimer()}
                                        <div class="bouton-supprimer">
                                            <button
                                                type="button"
                                                class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
                                                onclick={supprimerContrôleEnModification}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    {/snippet}
                                </FormulaireContrôle>

                            {:else}
                                <section class="contrôle">
                                    <h6>
                                        Contrôle du <time datetime={contrôle.date_contrôle?.toISOString()}>{formatDateAbsolue(contrôle.date_contrôle)}</time>
                                        <TagRésultatContrôle résultatContrôle={contrôle.résultat || NON_RENSEIGNÉ}></TagRésultatContrôle>
                                        <button class="contrôles fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line" 
                                            onclick={() => passerContrôleEnModification(contrôle)}>
                                            Modifier
                                        </button>
                                    </h6>
                                    <strong>Commentaire&nbsp;:</strong> {contrôle.commentaire}<br>
                                    <strong>Action suite au contrôle&nbsp;:</strong> {contrôle.type_action_suite_contrôle}<br>
                                    <strong>Date action suite au contrôle&nbsp;:</strong> 
                                        <time datetime={contrôle.date_action_suite_contrôle?.toISOString()}>{formatDateRelative(contrôle.date_action_suite_contrôle)}</time>
                                    <br>
                                    <strong>Date prochaine échéance&nbsp;:</strong> 
                                        <time datetime={contrôle.date_prochaine_échéance?.toISOString()}>{formatDateRelative(contrôle.date_prochaine_échéance)}</time>
                                    <br>
                                </section>
                            {/if}
                        {/each}
                    </section>
                {/if}
            </section>
            {/snippet}
    </DéplierReplier>
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

    section.contrôles{
        section.contrôle{
            margin-bottom: 0.5rem;
        }

        .bouton-supprimer{
            margin-top: 2rem;
        }
    }
    
}


</style>