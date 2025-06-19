<script>
    import DateInput from '../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../commun/DateToJSON.js';
    import {formatDateAbsolue} from '../../affichageDossier.js'
    import {supprimerPrescription as supprimerPrescriptionBaseDeDonnées, ajouterModifierPrescription} from '../../actions/prescriptions.js'


    /** @import {FrontEndDécisionAdministrative} from '../../../types/API_Pitchou.ts' */
    /** @import Prescription from '../../../types/database/public/Prescription.ts' */

    /** @type {FrontEndDécisionAdministrative} */
    export let décisionAdministrative

    let {
        numéro, type, date_signature, date_fin_obligations, fichier_url, 
        prescriptions: _prescriptions
    } = décisionAdministrative

    /** @type {Set<Partial<Prescription>>}*/
    $: prescriptions = _prescriptions ? new Set(_prescriptions) : new Set()

    const NON_RENSEIGNÉ = '(non renseigné)'

    function rerender(){
        prescriptions = prescriptions
    }

    function ajouterPrescription(){
        /** @type {Partial<Prescription>} */
        const nouvellePrescription = {
            date_échéance: undefined,
            numéro_article: '',
            description: '',
            décision_administrative: décisionAdministrative.id,
            individus_compensés: undefined,
            individus_évités: undefined,
            nids_compensés: undefined,
            nids_évités: undefined,
            surface_compensée: undefined,
            surface_évitée: undefined
        }

        prescriptions.add(nouvellePrescription)

        rerender()
    }

    /** @type {WeakMap<Partial<Prescription>, {prescriptionIdP: Promise<Prescription['id'] | undefined>, updateAfterRecievingId: boolean}>}*/
    const prescriptionToPendingIdAndLatestData = new WeakMap()

    /**
     * 
     * @param {Partial<Prescription>} prescription
     */
    async function savePrescription(prescription){
        console.log('savePrescription', prescription)

        if(prescription.date_échéance){
            Object.defineProperty(prescription.date_échéance, 'toJSON', {value: toJSONPerserveDate})
        }
        

        const prescriptionEntry = prescriptionToPendingIdAndLatestData.get(prescription)
        if(prescriptionEntry){
            prescriptionEntry.updateAfterRecievingId = true
        }
        else{
            if(ajouterModifierPrescription){
                /** @type {Promise<Prescription['id'] | undefined>} */
                const prescriptionIdP = ajouterModifierPrescription(prescription)

                if(!prescription.id){
                    const newPrescriptionEntry = {
                        prescriptionIdP,
                        updateAfterRecievingId: false
                    }

                    prescriptionToPendingIdAndLatestData.set(prescription, newPrescriptionEntry)
                    // @ts-ignore
                    prescription.id = (await prescriptionIdP).prescriptionId

                    // Peut avoir changé pendant le await
                    const updateAfterRecievingId = newPrescriptionEntry.updateAfterRecievingId
                    
                    prescriptionToPendingIdAndLatestData.delete(prescription)
                    
                    if(updateAfterRecievingId)
                        ajouterModifierPrescription(prescription)
                }
            }
        }
    }

    /**
     * 
     * @param {Partial<Prescription>} prescription
     */
    function supprimerPrescription(prescription){
        if(prescription.id){
            supprimerPrescriptionBaseDeDonnées(prescription.id)
        }

        prescriptions.delete(prescription)

        rerender()
    }


</script>

<section class="décision-administrative">
    <h4>{type || 'Décision de type inconnu'} {numéro || ''} du {formatDateAbsolue(date_signature)}</h4>
    <div class="fr-mb-1w">Date de fin des obligations : {date_fin_obligations ? formatDateAbsolue(date_fin_obligations) : NON_RENSEIGNÉ}</div>
    <div>Fichier de l'arrêté : 
        {#if fichier_url}
            <a class="fr-btn" href={fichier_url}>
                Télécharger
            </a>
        {:else}
            (pas de fichier pour le moment)
        {/if}
    </div>

    <section class="prescriptions">
        <h5>Prescriptions</h5>
        
        {#if prescriptions.size === 0}
            <p>Il n'y a pas de prescriptions associées à cette décision administrative pour le moment</p>

            <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterPrescription}>
                Ajouter une prescription
            </button>
        {:else}
            <table>
                <thead>
                    <tr>
                        <th>Numéro article</th>
                        <th>Description</th>
                        <th>Date échéance</th>
                        <th>Surface compensée (m²)</th>
                        <th>Surface évitée (m²)</th>
                        <th>Individus compensés</th>
                        <th>Individus évités</th>
                        <th>Nids compensés</th>
                        <th>Nids évités</th>
                        <th>Supprimer</th>
                    </tr>
                </thead>
                <tbody>
                    {#each prescriptions as prescription}
                    <tr class="prescription" on:focusout={(e) => {
                        if (!e.target?.classList.contains('bouton-supprimer')) {
                            savePrescription(prescription)
                        }
                    }}>
                        <td><input class="fr-input" bind:value={prescription.numéro_article}></td>
                        <td><input class="fr-input" bind:value={prescription.description}></td>
                        
                        <td><DateInput bind:date={prescription.date_échéance}></DateInput></td>

                        <td><input class="fr-input" bind:value={prescription.surface_compensée} type="number" min="0"></td>
                        <td><input class="fr-input" bind:value={prescription.surface_évitée} type="number" min="0"></td>
                        <td><input class="fr-input" bind:value={prescription.individus_compensés} type="number" min="0"></td>
                        <td><input class="fr-input" bind:value={prescription.individus_évités} type="number" min="0"></td>
                        <td><input class="fr-input" bind:value={prescription.nids_compensés} type="number" min="0"></td>
                        <td><input class="fr-input" bind:value={prescription.nids_évités} type="number" min="0"></td>
                        <td><button class="bouton-supprimer" type="button" on:click={() => supprimerPrescription(prescription)}>❌</button></td>
                    </tr>
                    {/each}
                    <tr>
                        <td colspan=5>
                            <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterPrescription}>
                                Ajouter une prescription
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        {/if}
        
    </section>
</section>


<style lang="scss">
    .décision-administrative{
        margin-bottom: 3rem;

        .prescriptions{
            .prescription{
                td:nth-child(1){
                    width: 5rem;
                }
                td:nth-child(2){
                    width: 21rem;
                }

                td:nth-child(n+3){
                    width: 6.5rem;
                }

                td:last-of-type{
                    width: 3rem;

                    text-align: center;
                    vertical-align: middle;

                    button{
                        all: unset;
                        cursor: pointer;
                    }
                }

                input{
                    padding-right: 0.5rem;
                    padding-left: 0.5rem;
                }

            }
        }
    }
</style>