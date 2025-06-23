<script>
    import {getODSTableRawContent, tableRawContentToObjects, tableWithoutEmptyRows} from '@odfjs/odfjs'
    import DateInput from '../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../commun/DateToJSON.js';
    import {formatDateAbsolue} from '../../affichageDossier.js'
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

            console.log('import prescriptions clean data', cleanData)

            /** @type {Partial<Prescription>[]} */
            const candidatsPrescriptions = cleanData.filter(row => {
                const prescriptionNumDec = row['Numéro décision administrative'] && row['Numéro décision administrative'].trim()
                return !prescriptionNumDec || prescriptionNumDec === (numéro && numéro.trim())
            })
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
                    date_échéance,
                    numéro_article,
                    description,
                    individus_compensés,
                    individus_évités,
                    nids_compensés,
                    nids_évités,
                    surface_compensée,
                    surface_évitée
                }
            })
                 
            console.log('candidatsPrescriptions', candidatsPrescriptions)

        }
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

            <section class="fr-mb-4w">
                <h6>Import d'un fichier d'espèces</h6>
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