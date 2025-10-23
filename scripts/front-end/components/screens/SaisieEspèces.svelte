<script>
    // @ts-check
    import Squelette from '../Squelette.svelte'
    import NomEspèce from '../NomEspèce.svelte'
    import DownloadButton from '../DownloadButton.svelte'

    import FieldsetOiseau from '../SaisieEspèces/FieldsetOiseau.svelte'
    import FieldsetNonOiseau from '../SaisieEspèces/FieldsetNonOiseau.svelte'
    import FieldsetFlore from '../SaisieEspèces/FieldsetFlore.svelte'

    import OiseauAtteintEditRow from '../SaisieEspèces/OiseauAtteintEditRow.svelte'
    import FauneNonOiseauAtteinteEditRow from '../SaisieEspèces/FauneNonOiseauAtteinteEditRow.svelte'
    import FloreAtteinteEditRow from '../SaisieEspèces/FloreAtteinteEditRow.svelte'


    import {normalizeNomEspèce, normalizeTexteEspèce} from '../../../commun/manipulationStrings.js'
    import { descriptionMenacesEspècesToOdsArrayBuffer } from '../../../commun/outils-espèces.js'


    /** @import { ParClassification, EspèceProtégée, OiseauAtteint, FauneNonOiseauAtteinte, FloreAtteinte} from '../../../types/especes.d.ts' **/
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

    let nombreEspècesSaisies = $derived(oiseauxAtteints.length + faunesNonOiseauxAtteintes.length + floresAtteintes.length)
    /** @type {File | undefined} */
    let fichierEspècesOds = $state()

    /** @type {string | undefined} */
    let messageErreurPréRemplirAvecDocumentOds = $state()

    /** @type {HTMLInputElement | undefined} */
    let inputFileUpload = $state()

    function rerender(){
        oiseauxAtteints = oiseauxAtteints
        faunesNonOiseauxAtteintes = faunesNonOiseauxAtteintes
        floresAtteintes = floresAtteintes
    }

    const mailto = "mailto:pitchou@beta.gouv.fr?subject=Rajouter%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9e%20manquante&body=Bonjour%2C%0D%0A%0D%0AJe%20souhaite%20saisir%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9es%20qui%20n'est%20pas%20list%C3%A9e%20dans%20l'outil%20Pitchou.%0D%0AFiche%20descriptive%20de%20l'esp%C3%A8ce%20%3A%0D%0A%0D%0ANom%20vernaculaire%20%3A%0D%0ANom%20latin%20%3A%0D%0ACD_NOM%20(identifiant%20TaxRef)%20%3A%0D%0ACommentaire%20%3A%0D%0A%0D%0AJe%20vous%20remercie%20de%20bien%20vouloir%20ajouter%20cette%20esp%C3%A8ce%0D%0A%0D%0AJe%20vous%20souhaite%20une%20belle%20journ%C3%A9e%20%E2%98%80%EF%B8%8F"

    /*function isFourchette(str) {
        const regex = /^\d+-\d+$/;
        return regex.test(str);
    }*/

    async function créerOdsBlob(){
            const odsArrayBuffer = await descriptionMenacesEspècesToOdsArrayBuffer({
                oiseau: oiseauxAtteints,
                "faune non-oiseau": faunesNonOiseauxAtteintes,
                flore: floresAtteintes,
            }) 

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

            if(Object.keys(descriptionMenacesEspèces).length >= 1){
                oiseauxAtteints = descriptionMenacesEspèces['oiseau'] || []
                faunesNonOiseauxAtteintes = descriptionMenacesEspèces['faune non-oiseau'] || []
                floresAtteintes = descriptionMenacesEspèces['flore'] || []

                const modale = document.querySelector('#modale-préremplir-depuis-import');
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
     * Recheche "à l'arrache"
     */


    /**
     *
     * @param {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @returns {Map<string, EspèceProtégée>}
     */
    function créerNomVersEspèceClassif(espècesProtégéesParClassification){
        /** @type {Map<string, EspèceProtégée>}>} */
        const nomVersEspèceClassif = new Map()

        for(const espèces of Object.values(espècesProtégéesParClassification)){
            for(const espèce of espèces){
                const {nomsScientifiques, nomsVernaculaires} = espèce;
                if(nomsScientifiques.size >= 1){
                    for(const nom of nomsScientifiques){
                        const normalized = normalizeNomEspèce(nom)
                        if(normalized && normalized.length >= 3){
                            nomVersEspèceClassif.set(normalized, espèce)
                        }
                    }
                }

                if(nomsVernaculaires.size >= 1){
                    for(const nom of nomsVernaculaires){
                        const normalized = normalizeNomEspèce(nom)
                        if(normalized && normalized.length >= 3){
                            nomVersEspèceClassif.set(normalized, espèce)
                        }
                    }
                }
            }
        }

        return nomVersEspèceClassif
    }

    /**
     * Aide saisie par texte
     */

    let texteEspèces = $state('');

    let nomVersEspèceClassif = $derived(créerNomVersEspèceClassif(espècesProtégéesParClassification))

    /**
     *
     * @param {string} texte
     * @returns {Set<EspèceProtégée>}
     */
     function chercherEspècesDansTexte(texte){
        /** @type {Set<EspèceProtégée>}*/
        const espècesTrouvées = new Set()

        for(const [nom, espClassif] of nomVersEspèceClassif){
            if(texte.includes(nom)){
                espècesTrouvées.add(espClassif)
            }
        }

        return espècesTrouvées
    }

    /** @type {Set<EspèceProtégée>} */
    let espècesÀPréremplirParTexte = $derived(chercherEspècesDansTexte(normalizeTexteEspèce(texteEspèces)))

    /** @type {EspèceProtégée[]} */
    let espècesÀPréremplir = $derived([...espècesÀPréremplirParTexte])

    let oiseauxÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'oiseau')))
    let fauneNonOiseauxÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'faune non-oiseau')))
    let floreÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'flore')))

    /** @type {ActivitéMenançante | undefined} */
    let activitéOiseauPréremplie = $state();
    /** @type {MéthodeMenançante | undefined} */
    let méthodeOiseauPréremplie = $state();
    /** @type {TransportMenançant | undefined} */
    let transportOiseauPrérempli = $state();
    /** @type {string | undefined} */
    let nombreIndividusOiseauPrérempli = $state();
    /** @type {number | undefined} */
    let nombreNidsOiseauPrérempli = $state();
    /** @type {number | undefined} */
    let nombreOeufsOiseauPrérempli = $state()
    /** @type {number | undefined} */
    let surfaceHabitatDétruitOiseauPrérempli = $state()

    /** @type {ActivitéMenançante | undefined} */
    let activitéFauneNonOiseauPréremplie = $state();
    /** @type {MéthodeMenançante | undefined} */
    let méthodeFauneNonOiseauPréremplie = $state();
    /** @type {TransportMenançant | undefined} */
    let transportFauneNonOiseauPréremplie = $state();
    /** @type {string | undefined} */
    let nombreIndividusFauneNonOiseauPréremplie = $state();
    /** @type {number | undefined} */
    let surfaceHabitatDétruitFauneNonOiseauPréremplie = $state();

    /** @type {ActivitéMenançante | undefined} */
    let activitéFlorePréremplie = $state();
    /** @type {string | undefined} */
    let nombreIndividusFlorePrérempli = $state();
    /** @type {number | undefined} */
    let surfaceHabitatDétruitFlorePrérempli = $state();

    function préremplirFormulaire(){
        for(const espèce of oiseauxÀPréremplir){
            oiseauxAtteints.push({
                espèce,
                activité: activitéOiseauPréremplie,
                méthode: méthodeOiseauPréremplie,
                transport: transportOiseauPrérempli,
                nombreIndividus: nombreIndividusOiseauPrérempli,
                nombreNids: nombreNidsOiseauPrérempli,
                nombreOeufs: nombreOeufsOiseauPrérempli,
                surfaceHabitatDétruit: surfaceHabitatDétruitOiseauPrérempli
            })
        }

        for(const espèce of fauneNonOiseauxÀPréremplir){
            faunesNonOiseauxAtteintes.push({
                espèce,
                activité: activitéFauneNonOiseauPréremplie,
                méthode: méthodeFauneNonOiseauPréremplie,
                transport: transportFauneNonOiseauPréremplie,
                nombreIndividus: nombreIndividusFauneNonOiseauPréremplie,
                surfaceHabitatDétruit: surfaceHabitatDétruitFauneNonOiseauPréremplie
            })
        }

        for(const espèce of floreÀPréremplir){
            floresAtteintes.push({
                espèce,
                activité: activitéFlorePréremplie,
                nombreIndividus: nombreIndividusFlorePrérempli,
                surfaceHabitatDétruit: surfaceHabitatDétruitFlorePrérempli
            })
        }

        texteEspèces = ''

        rerender()
    }

</script>

<Squelette nav={false} {email} title="Espèces protégées impactées">
    <article>

        <header>
            <h1 class="fr-mt-4w">Espèces protégées impactées</h1>

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
                <dialog id="modale-préremplir-depuis-import" class="fr-modal" aria-labelledby="Pré-remplir avec une liste déjà réalisée" aria-modal="true">
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

                <dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-labelledby="Pré-remplissage des espèces protégées impactées" aria-modal="true">
                    <div class="fr-container fr-container--fluid fr-container-md">
                        <div class="fr-grid-row fr-grid-row--center">
                            <div class="fr-col-12 fr-col-md-8 fr-col-lg-6">
                                <div class="fr-modal__body">
                                    <div class="fr-modal__header">
                                        <button aria-controls="modale-préremplir-depuis-texte" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
                                    </div>
                                    <div class="fr-modal__content">
                                        <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
                                            Pré-remplissage des espèces protégées impactées
                                        </h2>
                                        <div class="fr-mb-4w">
                                            <p>
                                                Dans la boîte de texte ci-dessous, coller du texte approximatif.
                                                Par exemple, en copiant à partir d'un tableau dans un pdf.
                                                Les espèces seront reconnues et permettront le pré-remplissage du formulaire
                                            </p>
                                            <textarea bind:value={texteEspèces} class="fr-input"></textarea>
                                        </div>
                                    </div>
                                    <div class="fr-modal__footer">
                                        <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-auto">Valider le texte</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </dialog>

                {#if espècesÀPréremplirParTexte.size >= 1}
                    <details open>
                        <summary>
                            <h2>Pré-remplissage automatique</h2>
                        </summary>

                        {#if oiseauxÀPréremplir.size >= 1}
                        <section class="préremplir-espèces fr-mb-4w">
                            <h3>{oiseauxÀPréremplir.size} oiseaux</h3>
                            <ul>
                                {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                                    <li><NomEspèce {espèce}/></li>
                                {/each}
                            </ul>

                            <div class="fr-table fr-table--bordered">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type d’impact</th>
                                            <th>Méthode</th>
                                            <th>Moyen de poursuite</th>
                                            <th>Nombre d'individus</th>
                                            <th>Nids</th>
                                            <th>Œufs</th>
                                            <th>Surface habitat détruit (m²)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <OiseauAtteintEditRow
                                            bind:activité={activitéOiseauPréremplie}
                                            bind:méthode={méthodeOiseauPréremplie}
                                            bind:transport={transportOiseauPrérempli}
                                            bind:nombreIndividus={nombreIndividusOiseauPrérempli}
                                            bind:nombreNids={nombreNidsOiseauPrérempli}
                                            bind:nombreOeufs={nombreOeufsOiseauPrérempli}
                                            bind:surfaceHabitatDétruit={surfaceHabitatDétruitOiseauPrérempli}
                                            activitésMenaçantes={[...activitesParClassificationEtreVivant["oiseau"].values()]}
                                            méthodesMenaçantes={[...méthodesParClassificationEtreVivant["oiseau"].values()]}
                                            transportMenaçants={[...transportsParClassificationEtreVivant["oiseau"].values()]}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        {/if}

                        {#if fauneNonOiseauxÀPréremplir.size >= 1}
                        <section class="préremplir-espèces fr-mb-4w">
                            <h3>{fauneNonOiseauxÀPréremplir.size} faunes non-oiseau</h3>
                            <ul>
                                {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                                    <li><NomEspèce {espèce}/></li>
                                {/each}
                            </ul>

                            <div class="fr-table fr-table--bordered">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type d’impact</th>
                                            <th>Méthode</th>
                                            <th>Moyen de poursuite</th>
                                            <th>Nombre d'individus</th>
                                            <th>Surface habitat détruit (m²)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <FauneNonOiseauAtteinteEditRow
                                            bind:activité={activitéFauneNonOiseauPréremplie}
                                            bind:méthode={méthodeFauneNonOiseauPréremplie}
                                            bind:transport={transportFauneNonOiseauPréremplie}
                                            bind:nombreIndividus={nombreIndividusFauneNonOiseauPréremplie}
                                            bind:surfaceHabitatDétruit={surfaceHabitatDétruitFauneNonOiseauPréremplie}
                                            activitésMenaçantes={[...activitesParClassificationEtreVivant["faune non-oiseau"].values()]}
                                            méthodesMenaçantes={[...méthodesParClassificationEtreVivant["faune non-oiseau"].values()]}
                                            transportMenaçants={[...transportsParClassificationEtreVivant["faune non-oiseau"].values()]}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        {/if}

                        {#if floreÀPréremplir.size >= 1}
                        <section class="préremplir-espèces fr-mb-4w">
                            <h3>{floreÀPréremplir.size} flores</h3>
                            <ul>
                                {#each [...floreÀPréremplir] as espèce (espèce)}
                                    <li><NomEspèce {espèce}/></li>
                                {/each}
                            </ul>

                            <div class="fr-table fr-table--bordered">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type d’impact</th>
                                            <th>Nombre d'individus</th>
                                            <th>Surface habitat détruit (m²)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <FloreAtteinteEditRow
                                            bind:activité={activitéFlorePréremplie}
                                            bind:nombreIndividus={nombreIndividusFlorePrérempli}
                                            bind:surfaceHabitatDétruit={surfaceHabitatDétruitFlorePrérempli}
                                            activitésMenaçantes={[...activitesParClassificationEtreVivant["flore"].values()]}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        {/if}

                        <button onclick={préremplirFormulaire} type="button" class="fr-btn">
                            Pré-remplir avec ces espèces
                        </button>                        
                    </details>
                {/if}
            </div>
        </div>

        <form class="fr-mb-4w">
            <FieldsetOiseau
                bind:oiseauxAtteints={oiseauxAtteints}
                espècesProtégéesOiseau={espècesProtégéesParClassification["oiseau"]}
                activitésMenaçantes={[...activitesParClassificationEtreVivant["oiseau"].values()]}
                méthodesMenaçantes={[...méthodesParClassificationEtreVivant["oiseau"].values()]}
                transportMenaçants={[...transportsParClassificationEtreVivant["oiseau"].values()]}
            />
            <FieldsetNonOiseau
                bind:faunesNonOiseauxAtteintes={faunesNonOiseauxAtteintes}
                espècesProtégéesFauneNonOiseau={espècesProtégéesParClassification["faune non-oiseau"]}
                activitésMenaçantes={[...activitesParClassificationEtreVivant["faune non-oiseau"].values()]}
                méthodesMenaçantes={[...méthodesParClassificationEtreVivant["faune non-oiseau"].values()]}
                transportMenaçants={[...transportsParClassificationEtreVivant["faune non-oiseau"].values()]}
            />
            <FieldsetFlore
                bind:floresAtteintes={floresAtteintes}
                espècesProtégéesFlore={espècesProtégéesParClassification["flore"]}
                activitésMenaçantes={[...activitesParClassificationEtreVivant["flore"].values()]}
            />
        </form>
        <div class="fr-grid-row fr-mb-4w">
            <div class="fr-col-8">
                <div class="fr-callout fr-icon-information-line">
                    <details>
                        <summary><h3 class="fr-callout__title">Je ne trouve pas l'espèce que je veux saisir</h3></summary>
                        <p class="fr-callout__text">
                            Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci
                            <a target="_blank" href={mailto}>d’envoyer un mail à pitchou@beta.gouv.fr</a>en
                            indiquant l’espèce concernée (nom scientifique, nom vernaculaire, <code>CD_NOM</code>).<br>
                            Le <code>CD_NOM</code> est disponible sur
                            <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees">le site de l'INPN</a>,
                            en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br>
                            Par exemple, <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221">la Fauvette Pitchou a le <code>CD_NOM</code>
                                <code>4221</code></a>.
                        </p>
                    </details>
                </div>
            </div>
        </div>

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
            margin-inline: 4rem;
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
    }
</style>
