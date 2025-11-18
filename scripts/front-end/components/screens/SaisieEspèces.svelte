<script>
    // @ts-check
    import Squelette from '../Squelette.svelte'
    import DownloadButton from '../DownloadButton.svelte'
    import EspècesProtégéesGroupéesParImpact from '../EspècesProtégéesGroupéesParImpact.svelte'
    import ModalePréremplirDepuisTexte from '../SaisieEspèces/ModalePréremplirDepuisTexte.svelte'
    import FormulaireSaisieEspèce from '../SaisieEspèces/FormulaireSaisieEspèce.svelte'
    import { descriptionMenacesEspècesToOdsArrayBuffer } from '../../../commun/outils-espèces.js'
    import { chargerActivitésMéthodesTransports } from '../../actions/activitésMéthodesTransports.js'
    import Loader from '../Loader.svelte'
    import TuileSaisieEspèce from '../SaisieEspèces/TuileSaisieEspèce.svelte'
	import { tick } from 'svelte'


    /** @import { ParClassification, DescriptionImpact, EspèceProtégée, OiseauAtteint, FauneNonOiseauAtteinte, FloreAtteinte} from '../../../types/especes.d.ts' **/
    /** @import { ActivitéMenançante, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces } from '../../../types/especes.d.ts' **/


    /**
     * @typedef {Object} Props
     * @property {string | undefined} [email]
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} activitesParClassificationEtreVivant
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     * @property {(x: ArrayBuffer) => Promise<DescriptionMenacesEspèces>} importDescriptionMenacesEspècesFromOds
     * @property {OiseauAtteint[]} oiseauxAtteints
     * @property {FauneNonOiseauAtteinte[]} faunesNonOiseauxAtteintes
     * @property {FloreAtteinte[]} floresAtteintes
     */

    /** @type {Props} */
    let {
        email = undefined,
        espècesProtégéesParClassification,
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
        importDescriptionMenacesEspècesFromOds,
        oiseauxAtteints = $bindable(),
        faunesNonOiseauxAtteintes = $bindable(),
        floresAtteintes = $bindable()
    } = $props();

    /**
     * @type {Array<{ espèce?: EspèceProtégée, impacts?: DescriptionImpact[] }>}
     */
    let espècesImpactées = $state([{impacts: [{}]}])

    let nombreEspècesSaisies = $derived(espècesImpactées.filter((espèce) => !!espèce.espèce).length)

    /** @type {File | undefined} */
    let fichierEspècesOds = $state()

    /** @type {string | undefined} */
    let messageErreurPréRemplirAvecDocumentOds = $state()

    /** @type {HTMLInputElement | undefined} */
    let inputFileUpload = $state()

    /** @type {HTMLElement | undefined} */
    let modale;

    let modeLecture = $state(false);

    /**
     * @type {TuileSaisieEspèce[]}
     */
    let référencesEspèces = $state([])

    /**
     * @type {DescriptionMenacesEspèces}
     */
    let espècesImpactéesParClassification = $derived.by(() => {
        /**
         * @type {DescriptionMenacesEspèces}
         */
        let espècesImpactéesParClassification = {
            oiseau: [],
            'faune non-oiseau': [],
            flore: [],
        }

        for (const espèce of espècesImpactées) {
            for (const impact of espèce.impacts ?? []) {
                if (espèce.espèce) {
                    const classification = espèce.espèce.classification;
                    espècesImpactéesParClassification[classification].push({
                        espèce: espèce.espèce,
                        ...impact
                    })
                }
            }
        }

        return espècesImpactéesParClassification
    })

    const promesseRéférentiels = chargerActivitésMéthodesTransports();

    /**
     * @param {DescriptionMenacesEspèces} descriptionMenacesEspèces
     */
    function impactsParClassificationVerListeEspècesImpactées(descriptionMenacesEspèces) {
        /**
         * @type {Map<EspèceProtégée['CD_REF'], { espèce?: EspèceProtégée, impacts?: DescriptionImpact[] }>}
         */
        const impactParEspèces = new Map()
        const espèceParCD_REF = new Map()
        for (const classfication in descriptionMenacesEspèces) {
            /**
             * @type {Array<OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte>}
             */
            //@ts-ignore
            const espèces = descriptionMenacesEspèces[classfication] ?? []

            for (const espèce of espèces) {
                const espèceEtImpacts = impactParEspèces.get(espèce.espèce.CD_REF) ?? {
                    espèce: espèce.espèce,
                    impacts: []
                }
                espèceEtImpacts.impacts?.push(espèce)
                impactParEspèces.set(espèce.espèce.CD_REF, espèceEtImpacts)
                espèceParCD_REF.set(espèce.espèce.CD_REF, espèce)
            }
        }

        return [...impactParEspèces.values()]
    }

    async function créerOdsBlob(){
        const odsArrayBuffer = await descriptionMenacesEspècesToOdsArrayBuffer(espècesImpactéesParClassification)
        return new Blob([odsArrayBuffer], {type: 'application/vnd.oasis.opendocument.spreadsheet'})
    }

    /**
     * Import données via fichier
     */

    /**
     * Dans une version précédente, il y avait un bind:files sur le input@type=file
     * Mais, vraissemblablement, il y avait un bug de svelte qui considérait que files changeait quand
     * d'autres choses non-liés changeaient dans la page
     * Alors, on gère plutôt ça avec un évènement 'input' désormais plutôt que la réactivité de svelte
     *
     * @param {Event & {currentTarget: HTMLElement & HTMLInputElement}} e
     */
    async function onFileInput(e){
        messageErreurPréRemplirAvecDocumentOds = undefined
        /** @type {FileList | null} */
        const files = e.currentTarget.files
        fichierEspècesOds = files && files[0] || undefined
    }

    async function onClickPréRemplirAvecDocumentOds(){
        try {
            if(!fichierEspècesOds){
                throw new Error("Aucun fichier espèces .ods n'a été téléchargé.")
            }
            const descriptionMenacesEspèces = await fichierEspècesOds.arrayBuffer()
                .then(importDescriptionMenacesEspècesFromOds)

            if(Object.keys(descriptionMenacesEspèces).length >= 1) {

                espècesImpactées = impactsParClassificationVerListeEspècesImpactées(descriptionMenacesEspèces)

                if (modale) {
                    //@ts-ignore
                    window.dsfr(modale).modal.conceal();
                }
            }
        } catch (erreur) {
            messageErreurPréRemplirAvecDocumentOds = "Une erreur est survenue au moment de cliquer sur le bouton Pré-remplir.";
            if (erreur instanceof Error) {
                if (erreur.cause === 'format incorrect') {
                    messageErreurPréRemplirAvecDocumentOds = `Le fichier ne respecte pas le format décrit dans <a href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods" target="_blank" rel="noopener external" title="documentation des fichiers d'espèces – nouvelle fenêtre">la documentation des fichiers d'espèces.</a>`
                } else {
                    messageErreurPréRemplirAvecDocumentOds = erreur.message;
                }
            }
            // Déplacer le focus sur le champ de fichier en cas d'erreur
            if (inputFileUpload) {
                inputFileUpload.focus();
            }
            throw new Error(messageErreurPréRemplirAvecDocumentOds)
        }
    }

    /**
     * @param {Array<{ espèce: EspèceProtégée, impacts?: DescriptionImpact[] }>} espècesImpactéesPourPréremplissage
     */
    async function onClickPréRemplirAvecDocumentTexte(espècesImpactéesPourPréremplissage) {
        if (espècesImpactéesPourPréremplissage.length >= 1) {
            espècesImpactées = espècesImpactéesPourPréremplissage
            
            // Le tick() est nécessaire pour attendre que l'interface se mette à jour et permettre de faire le focus sur la bonne référence
            await tick()

            référencesEspèces = référencesEspèces.filter(ref => ref !== null)
            référencesEspèces[référencesEspèces.length - 1].focusFormulaireEspèce()
        }
    }
    $inspect(référencesEspèces)
</script>

<Squelette nav={false} {email} title="Espèces protégées impactées">
    <article>

        <header>
            <h1>Espèces protégées impactées</h1>

            <div class="fr-toggle">
                <input bind:checked={modeLecture} type="checkbox" class="fr-toggle__input" id="toggle-mode-lecture">
                <label class="fr-toggle__label" for="toggle-mode-lecture">
                    Mode lecture
                </label>
            </div>

            <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
                {#if modeLecture}
                    Mode lecture activé. Les espèces sont maintenant affichées regroupées par type d'impact.
                {:else}
                    Mode lecture désactivé. Vous pouvez modifier les espèces et leurs impacts.
                {/if}
            </div>

        <!--
            Ce composant avec la classe fr-translate est là pour qu'on aie un menu déroulant et le dsfr
            ne fournit pas de ciomposant plus générique pour le moment
            Ce morceau sera à revisiter soit avec un composant fait par nous
            soit par une mise à jour du DSFR s'il contient un jour un composant qui nous convient
        -->
        <div class="fr-translate fr-nav">
            <div class="fr-nav__item">
                <button aria-controls="methodes-preremplissage" aria-expanded="false" title="Choisir une méthode de pré-remplissage" type="button" class="fr-btn fr-btn--tertiary">
                    Pré-remplir
                </button>
                <div class="fr-collapse fr-translate__menu fr-menu" id="methodes-preremplissage">
                    <ul class="fr-menu__list">
                        <li>
                            <button class="fr-translate__language fr-btn fr-btn--secondary fr-nav__link" type="button" data-fr-opened="false" aria-controls="modale-préremplir-depuis-import" >Importer un document .ods</button>
                        </li>
                        <li>
                            <button class="fr-btn fr-btn--secondary fr-translate__language fr-nav__link" type="button" data-fr-opened="false" aria-controls="modale-préremplir-depuis-texte">Pré-remplir depuis un texte</button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        </header>

        <div class="fr-grid-row">
            <div class="fr-col">
                <dialog bind:this={modale} id="modale-préremplir-depuis-import" class="fr-modal" aria-labelledby="Pré-remplir avec une liste déjà réalisée" aria-modal="true">
                    <div class="fr-container fr-container--fluid fr-container-md">
                        <div class="fr-grid-row fr-grid-row--center">
                            <div class="fr-col-12 fr-col-md-8 fr-col-lg-6">
                                <div class="fr-modal__body">
                                    <div class="fr-modal__header">
                                        <button aria-controls="modale-préremplir-depuis-import" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
                                    </div>
                                    <div class="fr-modal__content">
                                        <h2 id="modale-préremplir-depuis-import-title" class="fr-modal__title">
                                            Pré-remplir avec une liste déjà réalisée
                                        </h2>
                                        <div class="fr-mb-4w">
                                            <span class="fr-text--sm">
                                                Vous pouvez choisir :
                                                <ul>
                                                    <li>
                                                        un document déjà généré avec cet outil
                                                    </li>
                                                    <li>
                                                        un document .ods qui respecte le format décrit dans <a href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods" target="_blank" rel="noopener external" title="Lien vers la page qui renseigne sur le format d'un fichier espèces - nouvelle fenêtre" class="fr-link fr-text--sm">la documentation des fichiers d'espèces</a>
                                                    </li>
                                                </ul>
                                            </span>
                                            <div class="fr-upload-group fr-mt-6w" class:fr-upload-group--error={messageErreurPréRemplirAvecDocumentOds}>
                                                <label class="fr-label" for="file-upload">
                                                    <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : ods</span>
                                                </label>
                                                <input
                                                    bind:this={inputFileUpload}
                                                    aria-label="Importer un fichier d'espèces"
                                                    oninput={onFileInput}
                                                    class="fr-upload"
                                                    type="file"
                                                    accept=".ods"
                                                    id="file-upload"
                                                    name="file-upload" />
                                                <div class="fr-messages-group" id="file-upload-messages" aria-live="polite">
                                                    {#if messageErreurPréRemplirAvecDocumentOds}
                                                        <p class="fr-message fr-message--error" id="file-upload-message-error-format-incorrect">
                                                            {@html messageErreurPréRemplirAvecDocumentOds}
                                                        </p>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="fr-modal__footer">
                                        <button class="fr-btn fr-ml-auto" onclick={onClickPréRemplirAvecDocumentOds}>
                                            Pré-remplir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </dialog>

                <ModalePréremplirDepuisTexte bind:référencesEspèces={référencesEspèces} {espècesProtégéesParClassification} {onClickPréRemplirAvecDocumentTexte} />
            </div>
        </div>

        {#if modeLecture}
            {#if nombreEspècesSaisies === 0}
                <div class="fr-grid-row fr-mb-2w">
                    <div class="fr-col">
                        <div class="fr-alert fr-alert--warning">
                            <p>
                                Aucune espèce n'a encore été saisie.
                            </p>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="fr-grid-row fr-mb-2w">
                    <div class="fr-col">
                        <div class="fr-alert fr-alert--info">
                            <p>
                                Mode lecture activé : les espèces sont affichées regroupées par type d'impact. Désactivez le mode lecture pour modifier les espèces.
                            </p>
                        </div>
                    </div>
                </div>
                {#await promesseRéférentiels}
                    <Loader></Loader>
                {:then {identifiantPitchouVersActivitéEtImpactsQuantifiés}}
                    <EspècesProtégéesGroupéesParImpact espècesImpactées={espècesImpactéesParClassification} {identifiantPitchouVersActivitéEtImpactsQuantifiés} />
                {/await}
            {/if}
        {:else}


            <FormulaireSaisieEspèce
                bind:espècesImpactées={espècesImpactées}
                bind:référencesEspèces={référencesEspèces}
                espècesProtégées={[...espècesProtégéesParClassification["oiseau"], ...espècesProtégéesParClassification["faune non-oiseau"], ...espècesProtégéesParClassification["flore"]]}
                activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
            />
        {/if}
        <footer class="fr-mb-4w">
            <button aria-controls="modale-validation-saisie" data-fr-opened="false" type="button" class="fr-btn fr-btn--lg fr-ml-auto">Valider ma saisie</button>
        </footer>
        <dialog id="modale-validation-saisie" class="fr-modal" aria-labelledby="modale-validation-saisie-title" data-fr-concealing-backdrop="true">
            <div class="fr-container fr-container--fluid fr-container-md">
                <div class="fr-grid-row fr-grid-row--center">
                    <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                        <div class="fr-modal__body">
                            <div class="fr-modal__header">
                            </div>
                            <div class="fr-modal__content">
                                <h2 id="modale-validation-saisie-title" class="fr-modal__title">
                                    Dernière étape : Ajouter votre saisie à votre dossier Démarches Simplifiées
                                </h2>
                                <ol id="liste-des-étapes-pour-ajouter-saisie-à-DS">
                                    <li>
                                        <span class="fr-text--lg">Télécharger le document récapitulatif de votre saisie.</span>
                                        <div class="flex-justify-content-center">
                                            <DownloadButton
                                                classname="fr-btn fr-mt-4v"
                                                label={`Télécharger le document récapitulatif (${nombreEspècesSaisies} espèce${nombreEspècesSaisies > 1 ? 's' : ''})`}
                                                makeFilename={() => `especes-impactées-${(new Date()).toISOString().slice(0, 'YYYY-MM-DD:HH-MM'.length)}.ods`}
                                                makeFileContentBlob={créerOdsBlob}
                                            />
                                        </div>
                                    </li>
                                    <li><span class="fr-text--lg">Ajouter le document récapitulatif dans votre dossier Démarches Simplifiées, section "3b saisie des espèces".</span></li>
                                    <li>
                                        <span class="fr-text--lg">Votre liste d'espèces protégées impactées sera liée à votre dossier.</span>

                                        <div class="fr-mt-1v fr-text--sm">Une fois le document récapitulatif ajouté, vous pouvez fermer cette fenêtre.</div>
                                    </li>
                                </ol>
                            </div>
                            <div class="fr-modal__footer">
                                <button aria-controls="modale-validation-saisie" title="Fermer" type="button" id="button-fermer-modale-validation-saisie" class="fr-btn fr-btn--secondary">Fermer la fenêtre</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </dialog>
    </article>
</Squelette>

<style lang="scss">
    article{
        header{
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
        }
        details{
            cursor: default; // surcharge dsfr parce que c'est bizarre
        }

        summary{
            h2, h3{
                display: inline-block;
            }
        }

        #liste-des-étapes-pour-ajouter-saisie-à-DS{
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        #button-fermer-modale-validation-saisie{
            margin-inline: auto;
        }

        .flex-justify-content-center{
            display:flex;
            justify-content:center;
        }

        footer{
            display: flex;
            justify-content: end;
        }

        .préremplir-espèces{
            ul{
                list-style: '- ';
            }
        }

        #modale-préremplir-depuis-import{
            ul{
                list-style: '- ';
            }
        }

        #file-upload-message-error-format-incorrect{
            display:unset
        }
        .fr-toggle{
            label{
                width: 100%;
            }
        }
    }
</style>
