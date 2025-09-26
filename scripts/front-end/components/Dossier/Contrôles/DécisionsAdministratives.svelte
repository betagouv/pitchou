<script>
    import {SvelteSet, SvelteMap} from 'svelte/reactivity'
    import DateInput from '../../common/DateInput.svelte'
    import Prescription from './Prescription.svelte'
    import FormulaireDécisionAdministrative from './FormulaireDécisionAdministrative.svelte'

    import toJSONPerserveDate from '../../../../commun/DateToJSON.js';

    import {formatDateAbsolue} from '../../../affichageDossier.js'
    import {supprimerPrescription as supprimerPrescriptionBaseDeDonnées, ajouterPrescription as ajouterPrescriptionBaseDeDonnées, modifierPrescription} from '../../../actions/prescriptions.js'
    import {créerPrescriptionContrôlesÀPartirDeFichier} from '../../../actions/décisionAdministrative.js'
    import {refreshDossierComplet} from '../../../actions/dossier.js'

    import store from '../../../store.js'


    /** @import {DécisionAdministrativePourTransfer, FrontEndDécisionAdministrative, FrontEndPrescription} from '../../../../types/API_Pitchou.ts' */
    /** @import Dossier from '../../../../types/database/public/Dossier.ts' */
    /** @import PrescriptionType from '../../../../types/database/public/Prescription.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {Dossier['id']} dossierId
     * @property {FrontEndDécisionAdministrative} décisionAdministrative
     * @property {() => Promise<unknown>} supprimerDécisionAdministrative
     */

    /** @type {Props} */
    let { dossierId, décisionAdministrative = $bindable(), supprimerDécisionAdministrative } = $props();

    //$inspect('décisionAdministrative', décisionAdministrative)


    let { id,
        numéro, type, date_signature, date_fin_obligations, fichier_url
    } = $derived(décisionAdministrative)

    /** @type {Set<Partial<FrontEndPrescription>>}*/
    let prescriptions = $state(décisionAdministrative.prescriptions ? new SvelteSet(décisionAdministrative.prescriptions) : new SvelteSet())
    //$: console.log('prescriptions', prescriptions)


    const NON_RENSEIGNÉ = '(non renseigné)'

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

        vuePrescription = 'modifier'
    }

    /** @type {Map<Partial<PrescriptionType>, {prescriptionIdP: Promise<PrescriptionType['id'] | undefined>, updateAfterRecievingId: boolean}>}*/
    const prescriptionToPendingIdAndLatestData = new SvelteMap()

    /**
     * 
     * @param {Partial<FrontEndPrescription>} prescription
     */
    async function savePrescription(prescription){
        if(prescription.date_échéance){
            Object.defineProperty(prescription.date_échéance, 'toJSON', {value: toJSONPerserveDate})
        }

        if (prescription.id) {
            // "contrôles" est une proprété du type FrontEndPrescription pas une propriété du type Prescription
            // ce qui pose un problème lors de l'insertion/l'update de la prescription en base de données
            const { contrôles, ...prescriptionSansContrôles } = prescription;
            modifierPrescription(prescriptionSansContrôles)
        } else {
            const pendingPrescriptionIdEntry = prescriptionToPendingIdAndLatestData.get(prescription)
            if(pendingPrescriptionIdEntry){
                pendingPrescriptionIdEntry.updateAfterRecievingId = true
            } else {
                /** @type {Promise<PrescriptionType['id'] | undefined>} */
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
                .then(nouvellesPrescriptions => {
                    prescriptions = new Set(nouvellesPrescriptions)

                    refreshDossierComplet(dossierId)
                })
        }
    }


    /** @type {DécisionAdministrativePourTransfer | undefined} */
    let décisionAdministrativeEnModification = $state()

    function passerEnVueModifierDécisionAdministrative(){
        décisionAdministrativeEnModification = {
            id,
            dossier: dossierId,
            numéro,
            type,
            date_fin_obligations,
            date_signature
        }
    }

    function annulerModification(){
        décisionAdministrativeEnModification = undefined
    }

    function sauvegarderDécisionAdministrative(){
        const modifierDécisionAdministrativeDansDossier = store.state.capabilities.modifierDécisionAdministrativeDansDossier

        if(!modifierDécisionAdministrativeDansDossier){
            throw new Error(`Pas les droits suffisants pour modifier une décision administrative`)
        }

        if(!décisionAdministrativeEnModification){
            throw new TypeError(`décisionAdministrativeEnModification est undefined dans sauvegarderDécisionAdministrative`)
        }

        modifierDécisionAdministrativeDansDossier(décisionAdministrativeEnModification)
        décisionAdministrative = Object.assign(décisionAdministrative, décisionAdministrativeEnModification)
    
        décisionAdministrativeEnModification = undefined

        refreshDossierComplet(dossierId)
    }

    /** @type {'consulter' | 'modifier'} */
    let vuePrescription = $state('consulter')

</script>

<section class="décision-administrative">

    {#if !décisionAdministrativeEnModification}
    <h4>
        {type || 'Décision de type inconnu'} {numéro || ''} du {formatDateAbsolue(date_signature)}
        <button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line" onclick={passerEnVueModifierDécisionAdministrative}>
            Modifier
        </button>
    </h4>
    <div class="fr-mb-1w">Date de fin des obligations : {date_fin_obligations ? formatDateAbsolue(date_fin_obligations) : NON_RENSEIGNÉ}</div>
    
    <div class="fr-mb-2w">
        {#if fichier_url}
            <a class="fr-btn fr-btn--secondary fr-btn--sm" href={fichier_url}>
                Télécharger le fichier de l'arrếté
            </a>
        {:else}
            (fichier manquant)
        {/if}
    </div>

    <section class="prescriptions">
        {#if prescriptions.size === 0}
            <h5>Prescriptions</h5>
            <section class="fr-mb-3w">
                <p>Il n'y a pas de prescriptions associées à cette décision administrative pour le moment</p>

                <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={ajouterPrescription}>
                    Ajouter une prescription
                </button>
            </section>

            <section class="fr-mb-4w">
                <h6>Import d'un fichier de prescriptions</h6>
                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload">
                        Importer un fichier de prescriptions. Un <a href="/data/modèles/modèle ajout prescriptions.ods">modèle est disponible</a>.
                        Il est important de garder les noms de colonnes (mais pas forcément l'ordre et elles sont toutes optionnelles)
                        <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : .ods</span>
                    </label>
                    <input oninput={onFileInput} class="fr-upload" type="file" accept=".ods" id="file-upload" name="file-upload">
                </div>
            </section>
        {:else}
            <h5>{prescriptions.size} prescriptions</h5>

            {#if vuePrescription === 'consulter'}
                {#each prescriptions as prescription}
                    <Prescription {prescription}></Prescription>
                {/each}

                <button class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-ball-pen-line" onclick={() => vuePrescription = 'modifier'}>
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
                            <tr class="prescription" onfocusout={(e) => {
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
                                <td><button class="bouton-supprimer fr-btn fr-btn--sm fr-icon-delete-line fr-btn--icon-left fr-btn--secondary" onclick={() => supprimerPrescription(prescription)}>Supprimer</button></td>
                            </tr>
                        {/each}
                        <tr><td colspan="9" class="fr-pt-1w">
                            <button class="fr-btn fr-btn--icon-left fr-icon-add-line" onclick={ajouterPrescription}>
                                Ajouter une prescription
                            </button>
                        </td></tr>
                    </tbody>
                </table>

                <button class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-eye-line fr-mt-3w" onclick={() => vuePrescription = 'consulter'}>
                    Modifications terminées
                </button>
            {/if}
        {/if}
        
    </section>

    {:else} <!-- there is a décisionAdministrativeEnModification -->
        <h4>Modifier décision administrative</h4>

        <FormulaireDécisionAdministrative décisionAdministrative={décisionAdministrativeEnModification || {}} onValider={sauvegarderDécisionAdministrative}>
            {#snippet boutonValider()}
                <button type="submit" class="fr-btn">Sauvegarder</button>
            {/snippet}
            {#snippet boutonAnnuler()}
                <button type="button" class="fr-btn fr-btn--secondary" onclick={annulerModification}>Annuler</button>
            {/snippet}
            {#snippet boutonSupprimer()}
                <button type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-close-line" onclick={supprimerDécisionAdministrative}>
                    Supprimer cette décision administrative
                </button>
            {/snippet}
        </FormulaireDécisionAdministrative>
    {/if}

</section>


<style lang="scss">
    .décision-administrative{
        h4{
            margin-bottom: 1rem;

            text-decoration: underline gray 2px;
        }

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
            }
        }
    }
</style>