<script>
    // @ts-nocheck
    import Squelette from '../Squelette.svelte'
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import NomEspèce from "../NomEspèce.svelte"
    import CopyButton from '../CopyButton.svelte'
    import FieldsetOiseau from '../SaisieEspèces/FieldsetOiseau.svelte'
    import FieldsetNonOiseau from '../SaisieEspèces/FieldsetNonOiseau.svelte'
    import FieldsetFlore from '../SaisieEspèces/FieldsetFlore.svelte'


    import {UTF8ToB64, normalizeNomEspèce, normalizeTexteEspèce} from '../../../commun/manipulationStrings.js'
    import { descriptionMenacesEspècesToJSON } from '../../../commun/outils-espèces'
    
    /** @import {
     *    ClassificationEtreVivant,
     *    EspèceProtégée,
     *    EtreVivantAtteint, 
     *    OiseauAtteint, 
     *    FauneNonOiseauAtteinte, 
     *    FloreAtteinte, 
     *    NomGroupeEspèces
     *  } from '../../../types/especes.d.ts' 
     **/


    export let email

    /** @type {Map<ClassificationEtreVivant, EspèceProtégée[]>} */
    export let espècesProtégéesParClassification;

    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    export let activitesParClassificationEtreVivant

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    export let méthodesParClassificationEtreVivant
    
    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    export let transportsParClassificationEtreVivant

    /** @type {Map<NomGroupeEspèces, EspèceProtégée[]>} */
    export let groupesEspèces

    /** @type {OiseauAtteint[]}*/
    export let oiseauxAtteints

    /** @type {FauneNonOiseauAtteinte[]} */
    export let faunesNonOiseauxAtteintes

    /** @type {FloreAtteinte[]}*/
    export let floresAtteintes

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
    
    function créerLienPartage(){
        const jsonable = descriptionMenacesEspècesToJSON({
            oiseau: oiseauxAtteints,
            "faune non-oiseau": faunesNonOiseauxAtteintes,
            flore: floresAtteintes,
        })
        const lienPartage = `${location.origin}${location.pathname}?data=${UTF8ToB64(JSON.stringify(jsonable))}`

        return lienPartage
    }

    /**
     * Recheche "à l'arrache"
     */


    /**
     * 
     * @param {Map<ClassificationEtreVivant, EspèceProtégée[]>} espècesProtégéesParClassification
     * @returns {Map<string, EspèceProtégée>}
     */
    function créerNomVersEspèceClassif(espècesProtégéesParClassification){
        /** @type {Map<string, EspèceProtégée>}>} */
        const nomVersEspèceClassif = new Map()

        for(const espèces of espècesProtégéesParClassification.values()){
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

    let texteEspèces = '';

    $: nomVersEspèceClassif = créerNomVersEspèceClassif(espècesProtégéesParClassification)

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

    /** @type {Set<EspèceProtégée> | undefined} */
    $: espècesÀPréremplirParTexte = chercherEspècesDansTexte(normalizeTexteEspèce(texteEspèces))

    /**
     * Aide saisie par groupe
     */
    /** @type {string} */
    let nomGroupChoisi = '';

    /** @type {EspèceProtégée[] | undefined} */
    $: groupeChoisi = groupesEspèces.get(nomGroupChoisi)
    $: espècesÀPréremplirParGroupe = groupeChoisi || []

    /** @type {Set<EspèceProtégée>} */
    $: espècesÀPréremplir = new Set([...espècesÀPréremplirParTexte, ...espècesÀPréremplirParGroupe])

    /**
     * 
     * @param {EspèceProtégée} espèce
     */
     function ajouterEspèce(espèce){
        if(espèce.classification === 'oiseau'){
            oiseauxAtteints.push({espèce})
        }
        else if (espèce.classification === 'faune non-oiseau') {
            faunesNonOiseauxAtteintes.push({espèce})
        } else {
            floresAtteintes.push({espèce})
        }
    }

    /**
     * @param {Set<EspèceProtégée>} _espècesÀPréremplir
     */
    function préremplirFormulaire(_espècesÀPréremplir){
        for(const espèce of _espècesÀPréremplir){
            ajouterEspèce(espèce)
        }
        
        texteEspèces = ''
        nomGroupChoisi = ''

        rerender()
    }

    /**
     * 
     * @param {ClassificationEtreVivant} classification
     * @returns {EspèceProtégée[]}
     */
    function getEspècesPourClassification(classification) {
        return espècesProtégéesParClassification.get(classification)
    }
</script>


<Squelette nav={false} {email}>
    <article>
        <h1 class="fr-mt-6w">Saisie des espèces protégées impactées</h1>

        <div class="fr-grid-row fr-mt-6w fr-mb-4w">
            <div class="fr-col">
                <details open>
                    <summary><h2>Pré-remplissage automatique</h2></summary>

                    <section class="fr-mb-4w">
                        <h3>Depuis un copier/coller</h3>
                        <p>
                            Dans la boîte de texte ci-dessous, coller du texte approximatif.
                            Par exemple, en copiant à partir d'un tableau dans un pdf.
                            Les espèces seront reconnues et permettront le pré-remplissage du formulaire
                        </p>
                        <textarea bind:value={texteEspèces} class="fr-input"></textarea>
                    </section>
                    
                    <section class="fr-mb-4w">
                        <h3>Depuis un groupe d'espèces</h3>
                        <div class="fr-select-group">
                            <label class="fr-label" for="select">
                                Choisir un groupe d'espèces à ajouter
                            </label>
                            <select bind:value={nomGroupChoisi} class="fr-select" id="select">
                                <option value="" selected disabled hidden>Sélectionner une option</option>
                                {#each [...groupesEspèces.keys()] as nomGroupe}
                                    <option value={nomGroupe}>{nomGroupe}</option>
                                {/each}
                            </select>
                        </div>
                    </section>

                    {#if espècesÀPréremplir && espècesÀPréremplir.size >= 1}
                    <section class="fr-mb-4w">
                        <h3>{espècesÀPréremplir.size} espèce.s</h3>
                        <ul>
                            {#each [...espècesÀPréremplir] as espèce (espèce)}
                                <li><NomEspèce {espèce}/></li>
                            {/each}
                        </ul>

                        <button on:click={() => préremplirFormulaire(espècesÀPréremplir)} type="button" class="fr-btn">Pré-remplir avec ces espèces</button>
                    </section>
                    {/if}
                </details>
            </div>
        </div>

        <form class="fr-mb-4w">
            <h2>Liste des espèces</h2>

            <FieldsetOiseau
                bind:oiseauxAtteints={oiseauxAtteints}
                espècesProtégéesOiseau={getEspècesPourClassification("oiseau")}
                activitésMenaçantes={activitesParClassificationEtreVivant.get("oiseau")}
                méthodesMenaçantes={méthodesParClassificationEtreVivant.get("oiseau")}
                transportMenaçants={transportsParClassificationEtreVivant.get("oiseau")}
            />
            <FieldsetNonOiseau
                bind:faunesNonOiseauxAtteintes={faunesNonOiseauxAtteintes}
                espècesProtégéesFauneNonOiseau={getEspècesPourClassification("faune non-oiseau")}
                activitésMenaçantes={activitesParClassificationEtreVivant.get("faune non-oiseau")}
                méthodesMenaçantes={méthodesParClassificationEtreVivant.get("faune non-oiseau")}
                transportMenaçants={transportsParClassificationEtreVivant.get("faune non-oiseau")}
            />
            <FieldsetFlore
                bind:floresAtteintes={floresAtteintes}
                espècesProtégéesFlore={getEspècesPourClassification("flore")}
                activitésMenaçantes={activitesParClassificationEtreVivant.get("flore")}
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
        <div class="fr-grid-row fr-mb-10w">
            <div class="fr-col-8">
                <h2>Lien pour votre dossier</h2>
                <p>Une fois la liste des espèces saisie, créer un lien ci-dessous et le copier dans votre dossier Démarches Simplifiées.</p>

                <CopyButton
                    classname="fr-btn fr-btn--lg copy-link"
                    textToCopy={créerLienPartage}
                    initialLabel="Créer le lien et le copier dans le presse-papier"
                />
            </div>
        </div>
    </article>
</Squelette>

<style lang="scss">
	article{

        details{
            cursor: default; // surcharge dsfr parce que c'est bizarre
        }

        summary{
            h2, h3{
                display: inline-block;
            }
        }
    }	
</style>
