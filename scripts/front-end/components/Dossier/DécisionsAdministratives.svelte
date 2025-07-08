<script>
    import {getODSTableRawContent, tableRawContentToObjects, tableWithoutEmptyRows} from '@odfjs/odfjs'
    import DateInput from '../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../commun/DateToJSON.js';
    import {formatDateAbsolue, formatDateRelative} from '../../affichageDossier.js'
    import {supprimerPrescription as supprimerPrescriptionBaseDeDonnées, ajouterPrescription as ajouterPrescriptionBaseDeDonnées, modifierPrescription} from '../../actions/prescriptions.js'


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
        prescriptionsEnContrôle = prescriptionsEnContrôle
    }

    function ajouterPrescription(){
        /** @type {Partial<Prescription>} */
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

    /** @type {WeakMap<Partial<Prescription>, {prescriptionIdP: Promise<Prescription['id'] | undefined>, updateAfterRecievingId: boolean}>}*/
    const prescriptionToPendingIdAndLatestData = new WeakMap()

    /**
     * 
     * @param {Partial<Prescription>} prescription
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
     * @param {Partial<Prescription>} prescription
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
            const rawData = await getODSTableRawContent(importPrescriptionFileAB)
            const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0]

            /** @type {Partial<Prescription>[]} */
            // @ts-ignore
            const candidatsPrescriptions = cleanData.filter(row => {
                const prescriptionNumDec = row['Numéro décision administrative'] && row['Numéro décision administrative'].trim()
                return !prescriptionNumDec || prescriptionNumDec === (numéro && numéro.trim())
            })
            // @ts-ignore
            .map(row => {
                const {
                    "Numéro article": numéro_article,
                    "Description": description,
                    "Date échéance": date_échéance,
                    "Surface compensée": surface_compensée,
                    "Surface évitée": surface_évitée,
                    "Individus compensés": individus_compensés, 
                    "Individus évités": individus_évités,
                    "Nids compensés": nids_compensés,
                    "Nids évités": nids_évités,
                } = row

                return {
                    décision_administrative: décisionAdministrative.id,
                    date_échéance: !date_échéance ? undefined : date_échéance,
                    numéro_article,
                    description,
                    individus_compensés: !individus_compensés ? undefined : individus_compensés,
                    individus_évités: !individus_évités ? undefined : individus_évités,
                    nids_compensés: !nids_compensés ? undefined : nids_compensés,
                    nids_évités: !nids_évités ? undefined : nids_évités,
                    surface_compensée: !surface_compensée ? undefined : surface_compensée,
                    surface_évitée: !surface_évitée ? undefined : surface_évitée,
                }
            })
                 
            prescriptions = prescriptions.union(new Set(candidatsPrescriptions))
            for(const p of prescriptions){
                savePrescription(p)
            }
        }
    }

    /** @type {Set<Partial<Prescription>>} */
    let prescriptionsEnContrôle = new Set()
    
    /**
     * 
     * @param {Partial<Prescription>}  prescription
     */
    function ouvrirContrôles(prescription){
        prescriptionsEnContrôle.add(prescription)

        rerender()
    }

    /**
     * 
     * @param {Partial<Prescription>}  prescription
     */
    function fermerContrôles(prescription){
        prescriptionsEnContrôle.delete(prescription)

        rerender()
    }

    /**
     * 
     * @param {Partial<Prescription>}  prescription
     */
    function ajouterContrôle(prescription){
        
    }
    

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
                    <section class="prescription-consultée">
                        <h6>
                            {prescription.description} 
                            {#if prescription.numéro_article}
                            - 
                            <small><strong>Numéro article&nbsp;:&nbsp;</strong>
                                {prescription.numéro_article}
                            </small>
                            {/if}
                        </h6>
                        <p></p>
                        <p><strong>Date d'échéance&nbsp;:</strong>
                            {#if prescription.date_échéance}
                                <time datetime={prescription.date_échéance?.toISOString()}>{formatDateRelative(prescription.date_échéance)}</time>
                            {:else}
                                {NON_RENSEIGNÉ}
                            {/if}
                        </p>
                        {#if prescription.surface_évitée || prescription.surface_compensée || 
                            prescription.individus_évités || prescription.surface_compensée || 
                            prescription.nids_évités || prescription.nids_compensés}
                            <p class="impacts-quantifiés">
                                {#if prescription.surface_évitée}<span><strong>Surface évitée&nbsp;:</strong> {prescription.surface_évitée}m²</span>{/if}
                                {#if prescription.surface_compensée}<span><strong>Surface compensée&nbsp;:</strong> {prescription.surface_compensée}m²</span>{/if}
                                {#if prescription.individus_évités}<span><strong>Individus évités&nbsp;:</strong> {prescription.individus_évités}</span>{/if}
                                {#if prescription.individus_compensés}<span><strong>Individus compensés&nbsp;:</strong> {prescription.individus_compensés}</span>{/if}
                                {#if prescription.nids_évités}<span><strong>Nids évités&nbsp;:</strong> {prescription.nids_évités}</span>{/if}
                                {#if prescription.nids_compensés}<span><strong>Nids compensés&nbsp;:</strong> {prescription.nids_compensés}</span>{/if}
                            </p>
                        {/if}

                        {#if prescriptionsEnContrôle.has(prescription)}
                        <button class="contrôles fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-survey-line" 
                            on:click={() => fermerContrôles(prescription)}>
                            Fermer contrôles
                        </button>
                        {:else}
                        <button class="contrôles fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-survey-line" 
                            on:click={() => ouvrirContrôles(prescription)}>
                            Ouvrir contrôles
                        </button>
                        {/if}

                        {#if prescriptionsEnContrôle.has(prescription)}
                            les contrôles
                        {/if}

                    </section>
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