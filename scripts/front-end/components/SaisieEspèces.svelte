<script>
    //@ts-check
    import Squelette from './Squelette.svelte'
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import '../../types.js'

    export let espècesProtégéesParClassification;

    export let activitesParClassificationEtreVivant
    export let méthodesParClassificationEtreVivant
    export let transportsParClassificationEtreVivant

    /** @type { DescriptionMenaceEspèce[] } */
    export let descriptionMenacesEspèces;

    console.log('descriptionMenacesEspèces', descriptionMenacesEspèces)

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
    
    // adapted from https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
    /**
     *
     * @param {string} s // cleartext string
     * @returns {string} // utf-8-encoded base64 string
     */
    export function UTF8ToB64(s) {
        return btoa(unescape(encodeURIComponent(s)))
    }


    const etreVivantClassificationToBloc = new Map([
        ["oiseau", {
            sectionClass: "saisie-oiseau",
            sectionTitre: `Espèces d’oiseaux concernées 🐦`
        }],
        ["faune non-oiseau", {
            sectionClass: "saisie-faune",
            sectionTitre: `Espèces animales (hors oiseaux) concernées 🐸`
        }],
        ["flore", {
            sectionClass: "saisie-flore",
            sectionTitre: `Espèces végétales concernées 🍀`
        }]
    ])


    function ajouterEspèce(espèce, classification, etresVivantsAtteints){
        if(classification === 'oiseau'){
            etresVivantsAtteints.push({
                espece: espèce,
                nombreIndividus: 0,
                nombreNids: 0,
                nombreOeufs: 0,
                surfaceHabitatDétruit: 0
            })
        }
        else{
            etresVivantsAtteints.push({
                espece: espèce,
                nombreIndividus: 0,
                surfaceHabitatDétruit: 0
            })
        }
        descriptionMenacesEspèces = descriptionMenacesEspèces // re-render
    }

    /**
     * 
     * @param {EtreVivantAtteint} _
     * @param {EtreVivantAtteint} _
     */
    function etresVivantsAtteintsCompareEspèce({espece: {NOM_VERN: nom1}}, {espece: {NOM_VERN: nom2}}) {
        if (nom1 < nom2) {
            return -1;
        }
        if (nom1 > nom2) {
            return 1;
        }
        return 0;
    }
                
    function supprimerLigne(etresVivantsAtteints, _espece){
        const index = etresVivantsAtteints.findIndex(({espece}) => espece === _espece);
        if (index > -1) { 
            etresVivantsAtteints.splice(index, 1);
        }

        descriptionMenacesEspèces = descriptionMenacesEspèces // re-render
    }

    /**
     * 
     * @param { OiseauAtteint | EtreVivantAtteint } etreVivantAtteint
     * @returns { OiseauAtteintJSON | EtreVivantAtteintJSON }
     */
    function etreVivantAtteintToJSON(etreVivantAtteint){
        const {
            espece, 
            activité, méthode, transport,
            nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit
        } = etreVivantAtteint

        if(nombreNids || nombreOeufs){
            return {
                espece: espece['CD_NOM'],
                activité: activité && activité.Code, 
                méthode: méthode && méthode.Code, 
                transport: transport && transport.Code,
                nombreIndividus, 
                nombreNids, 
                nombreOeufs, 
                surfaceHabitatDétruit
            }
        }
        else{
            return {
                espece: espece['CD_NOM'],
                activité: activité && activité.Code, 
                méthode: méthode && méthode.Code, 
                transport: transport && transport.Code,
                nombreIndividus,
                surfaceHabitatDétruit
            }
        }
    }

    /**
     * 
     * @param { DescriptionMenaceEspèce[] } descriptionMenacesEspèces
     * @returns { DescriptionMenaceEspècesJSON }
     */
    function descriptionMenacesEspècesToJSON(descriptionMenacesEspèces){
        return descriptionMenacesEspèces.map(({classification, etresVivantsAtteints}) => {
            return {
                classification, 
                etresVivantsAtteints: etresVivantsAtteints.map(etreVivantAtteintToJSON), 
                
            }
        })
    }

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

</script>


<Squelette nav={false}>
    <article>
        <div class="fr-grid-row fr-pt-6w fr-grid-row--center">
            <div class="fr-col">
                <h1>Saisie des espèces protégées impactées</h1>

                <section>
                    <p>Une fois la liste des espèces saisie, créer un lien ci-dessous et le copier dans votre dossier Démarches Simplifiées.</p>
                    <button class="fr-btn copy-link" bind:this={copyButton} on:click={créerEtCopierLienPartage}>Créer le lien et le copier dans le presse-papier</button>
                </section>
            </div>
        </div>
        <form>
            {#each descriptionMenacesEspèces as {classification, etresVivantsAtteints}}
            <div class="fr-grid-row fr-pt-6w fr-grid-row--center">
                <div class="fr-col">
                    <section class={etreVivantClassificationToBloc.get(classification).sectionClass}>
                        <h2>{etreVivantClassificationToBloc.get(classification).sectionTitre}</h2>
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
                                    {#each etresVivantsAtteints as {espece, activité, méthode, transport, nombreIndividus, surfaceHabitatDétruit, nombreNids, nombreOeufs}}
                                        <tr>
                                            <td>
                                                <AutocompleteEspeces bind:selectedItem={espece} espèces={espècesProtégéesParClassification.get(classification)} htmlClass="fr-input"/>
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
                                            <td><button type="button" on:click={() => supprimerLigne(etresVivantsAtteints, espece)}>❌</button></td>
                                        </tr>
                                    {/each}
                                    <tr>
                                        <td>
                                            <AutocompleteEspeces espèces={espècesProtégéesParClassification.get(classification)} onChange={esp => {ajouterEspèce(esp, classification, etresVivantsAtteints)}} htmlClass="fr-input search"/>
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
                            <h3>Liste des espèces</h3>
                            {#each etresVivantsAtteints.toSorted(etresVivantsAtteintsCompareEspèce) as  {espece}, index }
                                {#if index !== 0 },&nbsp;{/if}{espece["NOM_VERN"]} (<i>{espece["LB_NOM"]}</i>)
                            {/each} 
                        </section>
                        {/if}
                    </section>
                </div>
            </div>
            
            {/each}
        </form>
        <div class="fr-grid-row fr-pt-6w">
            <div class="fr-col-8">
                <section class="espece-manquante">
                    <h1>ℹ️ Une espèce est manquante&nbsp;?</h1>
                    <p>
                        Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci   
                        <a target="_blank" href={mailto}>d’envoyer un mail à especes-protegees@beta.gouv.fr</a>en 
                        indiquant l’espèce concernée (nom scientifique, nom vernaculaire, <code>CD_NOM</code>).<br>
                        Le <code>CD_NOM</code> est disponible sur 
                        <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees">le site de l'INPN</a>, 
                        en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br>
                        Par exemple, <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221">la Fauvette Pitchou a le <code>CD_NOM</code> 
                            <code>4221</code></a>.
                    </p>
                </section>
            </div>
        </div>
    </article>
</Squelette>

<style lang="scss">
	article{

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
