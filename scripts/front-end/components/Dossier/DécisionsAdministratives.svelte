<script>    
    import DateInput from '../common/DateInput.svelte'
    import Prescription from './Prescription.svelte'

    import toJSONPerserveDate from '../../../commun/DateToJSON.js';

    import {formatDateAbsolue} from '../../affichageDossier.js'
    import {supprimerPrescription as supprimerPrescriptionBaseDeDonnées, ajouterPrescription as ajouterPrescriptionBaseDeDonnées, modifierPrescription} from '../../actions/prescriptions.js'
    import {créerPrescriptionContrôlesÀPartirDeFichier} from '../../actions/décisionAdministrative.js'
    import {refreshDossierComplet} from '../../actions/dossier.js'

    /** @import {FrontEndDécisionAdministrative} from '../../../types/API_Pitchou.ts' */
    /** @import Dossier from '../../../types/database/public/Dossier.ts' */
    /** @import PrescriptionType from '../../../types/database/public/Prescription.ts' */

    /** @type {Dossier['id']} */
    export let dossierId


    /** @type {FrontEndDécisionAdministrative} */
    export let décisionAdministrative

    let {
        numéro, type, date_signature, date_fin_obligations, fichier_url, 
        prescriptions: _prescriptions
    } = décisionAdministrative

    /** @type {Set<Partial<PrescriptionType>>}*/
    $: prescriptions = _prescriptions ? new Set(_prescriptions) : new Set()

    $: console.log('prescriptions', prescriptions)

    const NON_RENSEIGNÉ = '(non renseigné)'

    function rerender(){
        prescriptions = prescriptions
        prescriptionsEnContrôle = prescriptionsEnContrôle
    }

    function ajouterPrescription(){
        /** @type {Partial<PrescriptionType>} */
        const nouvellePrescription = {
            décision_administrative: décisionAdministrative.id,
            date_échéance: undefined,
            numéro_article: '',
            description: '',
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

    /** @type {WeakMap<Partial<PrescriptionType>, {prescriptionIdP: Promise<PrescriptionType['id'] | undefined>, updateAfterRecievingId: boolean}>}*/
    const prescriptionToPendingIdAndLatestData = new WeakMap()

    /**
     * 
     * @param {Partial<PrescriptionType>} prescription
     */
    async function savePrescription(prescription){
        if(prescription.date_échéance){
            Object.defineProperty(prescription.date_échéance, 'toJSON', {value: toJSONPerserveDate})
        }

        if (prescription.id) {
            modifierPrescription(prescription)
        } else {
            const pendingPrescriptionIdEntry = prescriptionToPendingIdAndLatestData.get(prescription)
            if(pendingPrescriptionIdEntry){
                pendingPrescriptionIdEntry.updateAfterRecievingId = true
            } else {
                /** @type {Promise<Prescription['id'] | undefined>} */
                const prescriptionIdP = ajouterPrescriptionBaseDeDonnées(prescription)

                const newPendingPrescriptionIdEntry = {
                    prescriptionIdP,
                    updateAfterRecievingId: false
                }

                prescriptionToPendingIdAndLatestData.set(prescription, newPendingPrescriptionIdEntry)

                // @ts-ignore
                prescription.id = (await prescriptionIdP).prescriptionId

                // Peut avoir changé pendant le await
                const updateAfterRecievingId = newPendingPrescriptionIdEntry.updateAfterRecievingId
                
                prescriptionToPendingIdAndLatestData.delete(prescription)
                
                if(updateAfterRecievingId)
                    modifierPrescription(prescription)
            }   
        }
    }

    /**
     * 
     * @param {Partial<PrescriptionType>} prescription
     */
    function supprimerPrescription(prescription){
        if(prescription.id){
            supprimerPrescriptionBaseDeDonnées(prescription.id)
        }

        prescriptions.delete(prescription)

        rerender()
    }

    /**
     * @param {Event & {currentTarget: HTMLElement & HTMLInputElement}} e
     */
    async function onFileInput(e){
        /** @type {FileList | null} */
        const files = e.currentTarget.files
        const file = files && files[0]

        if(file){
            const importPrescriptionFileAB = await file.arrayBuffer()
            créerPrescriptionContrôlesÀPartirDeFichier(importPrescriptionFileAB, décisionAdministrative)
                .then(() => refreshDossierComplet(dossierId))
        }
    }

    /** @type {Set<Partial<PrescriptionType>>} */
    let prescriptionsEnContrôle = new Set()
    

    /** @type {'consulter' | 'modifier'} */
    let vuePrescription = 'consulter'



</script>

<section class="décision-administrative">
    <h4>{type || 'Décision de type inconnu'} {numéro || ''} du {formatDateAbsolue(date_signature)}</h4>
    <div class="fr-mb-1w">Date de fin des obligations : {date_fin_obligations ? formatDateAbsolue(date_fin_obligations) : NON_RENSEIGNÉ}</div>
    <div class="fr-mb-1w">Fichier de l'arrêté : 
        {#if fichier_url}
            <a class="fr-btn" href={fichier_url}>
                Télécharger
            </a>
        {:else}
            (pas de fichier pour le moment)
        {/if}
    </div>

    <section class="prescriptions">
        {#if prescriptions.size === 0}
            <h5>Prescriptions</h5>
            <p>Il n'y a pas de prescriptions associées à cette décision administrative pour le moment</p>

            <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterPrescription}>
                Ajouter une prescription
            </button>

            <section class="fr-mb-4w">
                <h6>Import d'un fichier de prescriptions</h6>
                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload">
                        Importer un fichier de prescriptions. Un <a href="/data/modèles/modèle ajout prescriptions.ods">modèle est disponible</a>.
                        Il est important de garder les noms de colonnes (mais pas forcément l'ordre et elles sont toutes optionnelles)
                        <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : .ods</span>
                    </label>
                    <input on:input={onFileInput} class="fr-upload" type="file" accept=".ods" id="file-upload" name="file-upload">
                </div>
            </section>
        {:else}
            <h5>{prescriptions.size} prescriptions</h5>

            {#if vuePrescription === 'consulter'}
                {#each prescriptions as prescription}
                    <Prescription {prescription}></Prescription>
                {/each}

                <button class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-ball-pen-line" on:click={() => vuePrescription = 'modifier'}>
                    Modifier les prescriptions
                </button>
            {:else}
                <table class="prescriptions">
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
                                //@ts-ignore
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
                                <td><button class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--icon-left fr-btn--secondary" on:click={() => supprimerPrescription(prescription)}>Supprimer</button></td>
                            </tr>
                        {/each}
                        <tr><td colspan="9" class="fr-pt-1w">
                            <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterPrescription}>
                                Ajouter une prescription
                            </button>
                        </td></tr>
                    </tbody>
                </table>

                <button class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-eye-line fr-mt-3w" on:click={() => vuePrescription = 'consulter'}>
                    Modification terminées
                </button>
            {/if}
        {/if}
        
    </section>
</section>


<style lang="scss">
    .décision-administrative{
        h5{
            margin-bottom: 1rem;
        }

        margin-bottom: 3rem;


        table.prescriptions{
            .prescription, thead > tr{
                &>*{
                    margin: 0 2px;
                }

                &>:nth-child(1){
                    width: 5rem;
                }
                &>:nth-child(2){
                    width: 20rem;
                }
                &>:nth-child(3){
                    width: 9rem;
                }


                &>:nth-child(n+4){
                    width: 6rem;
                }

                input{
                    padding-right: 0.4rem;
                    padding-left: 0.5rem;
                }

            }
        }
    }
</style>