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
            <ul class="colonnes">
                <li>Numéro article</li>
                <li>Description</li>
                <li>Date échéance</li>
                <li>Surface compensée (m²)</li>
                <li>Surface évitée (m²)</li>
                <li>Individus compensés</li>
                <li>Individus évités</li>
                <li>Nids compensés</li>
                <li>Nids évités</li>
                <li>Supprimer</li>
            </ul>
            <ul>
                {#each prescriptions as prescription}
                    <li class="prescription" on:focusout={(e) => {
                        //@ts-ignore
                        if (!e.target?.classList.contains('bouton-supprimer')) {
                            savePrescription(prescription)
                        }
                    }}>
                        <span><input class="fr-input" bind:value={prescription.numéro_article}></span>
                        <span><input class="fr-input" bind:value={prescription.description}></span>
                        
                        <span><DateInput bind:date={prescription.date_échéance}></DateInput></span>

                        <span><input class="fr-input" bind:value={prescription.surface_compensée} type="number" min="0"></span>
                        <span><input class="fr-input" bind:value={prescription.surface_évitée} type="number" min="0"></span>
                        <span><input class="fr-input" bind:value={prescription.individus_compensés} type="number" min="0"></span>
                        <span><input class="fr-input" bind:value={prescription.individus_évités} type="number" min="0"></span>
                        <span><input class="fr-input" bind:value={prescription.nids_compensés} type="number" min="0"></span>
                        <span><input class="fr-input" bind:value={prescription.nids_évités} type="number" min="0"></span>
                        <span><button class="bouton-supprimer" type="button" on:click={() => supprimerPrescription(prescription)}>❌</button></span>
                    </li>
                {/each}
                <li>
                    <button class="fr-btn fr-btn--icon-left fr-icon-add-line" on:click={ajouterPrescription}>
                        Ajouter une prescription
                    </button>
                </li>
            </ul>

            <table>
                <thead>
                    <tr>
                        
                    </tr>
                </thead>
                <tbody>
                    
                    <tr>
                        <td colspan=5>
                            
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
            ul{
                list-style: none;
                display: flex;
                flex-direction: column;

                padding-left: 0;

                li{
                    display: flex;
                    flex-direction: row;
                }
            }

            ul.colonnes{
                flex-direction: row;
            }


            .prescription, .colonnes{
                &>*{
                    margin: 0 2px;
                }

                &>:nth-child(1){
                    width: 5rem;
                }
                &>:nth-child(2){
                    width: 15rem;
                }
                &>:nth-child(3){
                    width: 9rem;
                }


                &>:nth-child(n+4){
                    width: 6rem;
                }

                &>:last-of-type{
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    align-items: center;

                    button{
                        all: unset;
                        cursor: pointer;
                    }
                }

                input{
                    padding-right: 0.4rem;
                    padding-left: 0.5rem;
                }

            }
        }
    }
</style>