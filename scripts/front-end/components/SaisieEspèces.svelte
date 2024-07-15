<script>
    //@ts-check
    import Squelette from './Squelette.svelte'
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import NomEspèce from "./NomEspèce.svelte"

    import {UTF8ToB64, normalizeNomEspèce, normalizeTexteEspèce} from '../../commun/manipulationStrings.js'
    import { descriptionMenacesEspècesToJSON } from '../../commun/outils-espèces';

    /** @import {ClassificationEtreVivant, EspèceProtégée, NomGroupeEspèces, DescriptionMenaceEspèce, EtreVivantAtteint} from "../../types.js" */


    export let email

    /** @type {Map<ClassificationEtreVivant, EspèceProtégée[]>} */
    export let espècesProtégéesParClassification;

    export let activitesParClassificationEtreVivant
    export let méthodesParClassificationEtreVivant
    export let transportsParClassificationEtreVivant

    /** @type {Map<NomGroupeEspèces, EspèceProtégée[]>} */
    export let groupesEspèces

    /** @type { DescriptionMenaceEspèce[] } */
    export let descriptionMenacesEspèces;

    function rerender(){
        descriptionMenacesEspèces = descriptionMenacesEspèces // re-render
    }    

    const mailto = "mailto:especes-protegees@beta.gouv.fr?subject=Rajouter%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9e%20manquante&body=Bonjour%2C%0D%0A%0D%0AJe%20souhaite%20saisir%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9es%20qui%20n'est%20pas%20list%C3%A9e%20dans%20l'outil%20Pitchou.%0D%0AFiche%20descriptive%20de%20l'esp%C3%A8ce%20%3A%0D%0A%0D%0ANom%20vernaculaire%20%3A%0D%0ANom%20latin%20%3A%0D%0ACD_NOM%20(identifiant%20TaxRef)%20%3A%0D%0ACommentaire%20%3A%0D%0A%0D%0AJe%20vous%20remercie%20de%20bien%20vouloir%20ajouter%20cette%20esp%C3%A8ce%0D%0A%0D%0AJe%20vous%20souhaite%20une%20belle%20journ%C3%A9e%20%E2%98%80%EF%B8%8F"

    /**
     * Les fourchettes sont des chaînes de caractères toujours au format 'x-y' où x et y sont des integer
     */
    const fourchettesIndividus = [
        '0-10',
        '11-100',
        '101-1000',
        '1001-10000',
        '10001+'
    ]

    /*function isFourchette(str) {
        const regex = /^\d+-\d+$/;
        return regex.test(str);
    }*/
    


    /** @type {Map<ClassificationEtreVivant, any>} */
    const etreVivantClassificationToBloc = new Map([
        ["oiseau", {
            sectionClass: "saisie-oiseau",
            sectionTitre: `Oiseaux 🐦`
        }],
        ["faune non-oiseau", {
            sectionClass: "saisie-faune",
            sectionTitre: `Animaux (hors oiseaux) 🐸`
        }],
        ["flore", {
            sectionClass: "saisie-flore",
            sectionTitre: `Végétaux 🍀`
        }]
    ])


    /**
     * 
     * @param {EspèceProtégée} espèce
     */
    function ajouterEspèce(espèce){
        //@ts-expect-error La description pour la classification va être trouvée
        const etresVivantsAtteints = descriptionMenacesEspèces.find(d => d.classification === espèce.classification).etresVivantsAtteints

        if(espèce.classification === 'oiseau'){
            etresVivantsAtteints.push({
                espèce,
                nombreIndividus: 0,
                nombreNids: 0,
                nombreOeufs: 0,
                surfaceHabitatDétruit: 0
            })
        }
        else{
            etresVivantsAtteints.push({
                espèce,
                nombreIndividus: 0,
                surfaceHabitatDétruit: 0
            })
        }
        
    }

    /**
     * 
     * @param {EspèceProtégée} espèce
     */
    function ajouterUneEspèce(espèce){
        ajouterEspèce(espèce)
        rerender()
    }


    /**
     * 
     * @param {EtreVivantAtteint} _
     * @param {EtreVivantAtteint} _
     */
    function etresVivantsAtteintsCompareEspèce({espèce: {nomsScientifiques: noms1}}, {espèce: {nomsScientifiques: noms2}}) {
        const [nom1] = noms1
        const [nom2] = noms2

        if (nom1 < nom2) {
            return -1;
        }
        if (nom1 > nom2) {
            return 1;
        }
        return 0;
    }

    /**
     * 
     * @param {EtreVivantAtteint[]} etresVivantsAtteints
     * @param {EspèceProtégée} _espèce 
     */
    function supprimerLigne(etresVivantsAtteints, _espèce){
        const index = etresVivantsAtteints.findIndex(({espèce}) => espèce === _espèce);
        if (index > -1) { 
            etresVivantsAtteints.splice(index, 1);
        }

        descriptionMenacesEspèces = descriptionMenacesEspèces // re-render
    }



    /** @type {HTMLButtonElement} */
    let copyButton;
    let lienPartage;

    function créerEtCopierLienPartage(){
        const jsonable = descriptionMenacesEspècesToJSON(descriptionMenacesEspèces)
        lienPartage = `${location.origin}${location.pathname}?data=${UTF8ToB64(JSON.stringify(jsonable))}`

        copyButton.classList.add("animate");
        copyButton.addEventListener("animationend", () =>
            copyButton.classList.remove("animate"),
        );

        navigator.clipboard
            .writeText(lienPartage)
            .then(() => {
                copyButton.textContent = "Copié dans le presse-papier !";
            })
            .catch((error) => {
                console.error("Une erreur s'est produite lors de la copie : ", error);
            });

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
     * Pré-calculs pour AutocompleteEspèces
     */
    /**
	 * 
	 * @param {EspèceProtégée} esp
	 */
    function espèceLabel(esp){
		return `${[...esp.nomsVernaculaires][0]} (${[...esp.nomsScientifiques][0]})`
	}

	/**
	 * 
	 * @param {EspèceProtégée[]} espèces
	 */
	function makeEspèceToLabel(espèces){
		return new Map(espèces.map(e => [e, espèceLabel(e)]))
	}
	
	/**
	 * 
	 * @param {EspèceProtégée[]} espèces
	 */
	function makeEspèceToKeywords(espèces){
		return new Map(espèces.map(e => [e, [...e.nomsVernaculaires, ...e.nomsScientifiques].join(' ')]))
	}

    $: classifToLabelFunction = new Map(
        [...espècesProtégéesParClassification]
            .map(([classif, espèces]) => [classif, makeEspèceToLabel(espèces)])
            .map(([classif, espèceToLabel]) => [classif, (e => espèceToLabel.get(e))])
    )    
    $: classifToKeywordsFunction = new Map(
        [...espècesProtégéesParClassification]
            .map(([classif, espèces]) => [classif, makeEspèceToKeywords(espèces)])
            .map(([classif, espèceToKeywords]) => [classif, (e => espèceToKeywords.get(e))])
    )

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
            {#each descriptionMenacesEspèces as {classification, etresVivantsAtteints}}
            <div class="fr-grid-row fr-mb-4w fr-grid-row--center">
                <div class="fr-col">
                    <section class={etreVivantClassificationToBloc.get(classification).sectionClass}>
                        <h3>{etreVivantClassificationToBloc.get(classification).sectionTitre}</h3>
                        <div class="fr-table fr-table--bordered">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Espèce</th>
                                        <th>Type d’impact</th>
                                        {#if classification !== "flore"}
                                        <th>Méthode</th>
                                        <th>Moyen de poursuite</th>
                                        {/if}
                                        <th>Nombre d'individus</th>
                                        {#if classification === "oiseau"}
                                        <th>Nids</th>
                                        <th>Œufs</th>
                                        {/if}
                                        <th>Surface habitat détruit (m²)</th>
                                        <th>Supprimer la ligne</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each etresVivantsAtteints as {espèce, activité, méthode, transport, nombreIndividus, surfaceHabitatDétruit, nombreNids, nombreOeufs}}
                                        <tr>
                                            <td>
                                                <AutocompleteEspeces 
                                                    bind:selectedItem={espèce} 
                                                    espèces={espècesProtégéesParClassification.get(classification)} 
                                                    htmlClass="fr-input"
                                                    labelFunction={classifToLabelFunction.get(classification)}
                                                    keywordsFunction={classifToKeywordsFunction.get(classification)}
                                                />
                                            </td>
                                            <td>
                                                <select bind:value={activité} class="fr-select">
                                                    <option>-</option>
                                                    {#each activitesParClassificationEtreVivant.get(classification) || [] as act}
                                                    <option value={act}>{act['étiquette affichée']}</option>
                                                    {/each}
                                                </select>
                                            </td>
                                            {#if classification !== "flore"}
                                            <td>
                                                <select bind:value={méthode} disabled={activité && activité['Méthode'] === 'n'} class="fr-select">
                                                    <option>-</option>
                                                    {#each méthodesParClassificationEtreVivant.get(classification) as met}
                                                        <option value={met}>{met['étiquette affichée']}</option>
                                                    {/each}
                                                </select>
                                            </td>
                                            <td>
                                                <select bind:value={transport} disabled={activité && activité['transport'] === 'n'} class="fr-select">
                                                    <option>-</option>
                                                    {#each transportsParClassificationEtreVivant.get(classification) as trans}
                                                        <option value={trans}>{trans['étiquette affichée']}</option>
                                                    {/each}
                                                </select>
                                            </td>
                                            {/if}
                                            <td><select bind:value={nombreIndividus} class="fr-select">
                                                {#each fourchettesIndividus as fourchette}
                                                    <option value={fourchette}>{fourchette}</option>
                                                {/each}
                                            </select></td>
                                            {#if classification === "oiseau"}
                                            <td><input type="number" bind:value={nombreNids} min="0" step="1" class="fr-input"></td>
                                            <td><input type="number" bind:value={nombreOeufs} min="0" step="1" class="fr-input"></td>
                                            {/if}
                                            <td><input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1" class="fr-input"></td>
                                            <td><button type="button" on:click={() => supprimerLigne(etresVivantsAtteints, espèce)}>❌</button></td>
                                        </tr>
                                    {/each}
                                    <tr>
                                        <td>
                                            <AutocompleteEspeces 
                                            espèces={espècesProtégéesParClassification.get(classification)} 
                                            onChange={esp => {ajouterUneEspèce(esp)}} 
                                            htmlClass="fr-input search"
                                            labelFunction={classifToLabelFunction.get(classification)}
                                            keywordsFunction={classifToKeywordsFunction.get(classification)}
                                        />
                                        </td>
                                        <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>
                                        {#if classification !== "flore"}
                                        <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>
                                        <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>
                                        {/if}
                                        <td> <select disabled class="fr-select"><option>- - - -</option></select> </td>
                                        <td><input disabled type="number" class="fr-input"></td>
                                        {#if classification === "oiseau"}
                                        <td><input disabled type="number" class="fr-input"></td>
                                        <td><input disabled type="number" class="fr-input"></td>
                                        {/if}
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {#if etresVivantsAtteints.length >= 1}
                        <section class="arrete-prefectoral fr-p-1w">
                            <h4>Récapitulatif des espèces</h4>
                            {#each etresVivantsAtteints.toSorted(etresVivantsAtteintsCompareEspèce) as  {espèce}, index (espèce) }
                                {#if index !== 0 },&nbsp;{/if}<NomEspèce {espèce}/>
                            {/each} 
                        </section>
                        {/if}
                    </section>
                </div>
            </div>
            {/each}
        </form>
        <div class="fr-grid-row fr-mb-4w">
            <div class="fr-col-8">
                <div class="fr-callout fr-icon-information-line">
                    <details>
                        <summary><h3 class="fr-callout__title">Je ne trouve pas l'espèce que je veux saisir</h3></summary>
                        <p class="fr-callout__text">
                            Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci   
                            <a target="_blank" href={mailto}>d’envoyer un mail à especes-protegees@beta.gouv.fr</a>en 
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
                <button class="fr-btn fr-btn--lg copy-link" bind:this={copyButton} on:click={créerEtCopierLienPartage}>Créer le lien et le copier dans le presse-papier</button>
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

        .saisie-oiseau, .saisie-flore, .saisie-faune {
            display: flex;
            flex-direction: column;
            align-items: flex-start;

            select{
                max-width: 10rem;
            }

            input[type="number"]{
                border-radius: 0.5em;
                padding: 0.4em;
                width: 5em;
            }

            label{
                select{
                    max-width: 30em;
                }
            }

            table{
                // surcharge DSFR pour que l'autocomplete s'affiche correctement
                overflow: initial;

                tr {
                    td, th{
                        padding: 0.2rem;

                        vertical-align: top;
                    }

                    td:last-of-type{
                        text-align: center;
                        vertical-align: middle;
                    }

                    button{
                        all: unset;
                        cursor: pointer;
                    }
                }
            }

            .arrete-prefectoral{
                border-radius: 0.4em;
                width: 100%;

                background-color: rgba(255, 255, 255, 0.1);
            }
        }
    }

    .copy-link{
      z-index: 1;
      position: relative;
      font-size: inherit;
      font-family: inherit;

      &::before {
        content: '';
        z-index: -1;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #444;
        transform-origin: center right;
        transform: scaleX(0);
        transition: transform 0.4s ease-in-out;
      }

      &.animate{
        color: white;
      }

      &.animate::before {
        transform-origin: center left;
        transform: scaleX(1);
      }
    }
	
</style>
