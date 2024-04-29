<script>
    //@ts-check
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import '../../types.js'

    export let espècesProtégéesParClassification;

    export let activitesParClassificationEtreVivant
    export let méthodesParClassificationEtreVivant
    export let transportsParClassificationEtreVivant

    /** @type { DescriptionMenaceEspèce[] } */
    export let descriptionMenacesEspèces;

    console.log('descriptionMenacesEspèces', descriptionMenacesEspèces)

    const mailto = "mailto:especes-protegees@beta.gouv.fr?subject=Rajouter%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9e%20manquante&body=Bonjour%2C%0A%0AJe%20souhaite%20saisir%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9es%20qui%20n'est%20pas%20list%C3%A9e%20dans%20l'outil%20Pitchou.%0AFiche%20descriptive%20de%20l'esp%C3%A8ce%20%3A%20%0A%0ANom%20vernaculaire%20%3A%20%0ANom%20latin%20%3A%20%0ACD_NOM%20(identifiant%20TaxRef)%20%3A%20%0AJustification%20l%C3%A9gale%20pour%20la%20protection%20%3A%20%0A%0AJe%20vous%20remercie%20de%20bien%20vouloir%20ajouter%20cette%20esp%C3%A8ce%0A%0AJe%20vous%20souhaite%20une%20belle%20journ%C3%A9e%20%E2%98%80%EF%B8%8F"

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

    // pour garder la ligne de sélection/ajout d'espèce vide après sélection
    let defaultSelectedItem = undefined
    $: defaultSelectedItem, defaultSelectedItem = undefined

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

    let lienPartage;

    function créerLienPartage(){
        const jsonable = descriptionMenacesEspècesToJSON(descriptionMenacesEspèces)
        console.log('jsonable', jsonable, UTF8ToB64(JSON.stringify(jsonable)).length)
        lienPartage = `${location.origin}${location.pathname}?data=${UTF8ToB64(JSON.stringify(jsonable))}`
    }

</script>

<article>
    <h1>Saisie des espèces protégées</h1>
    <h2>et des activités et méthodes, etc.</h2>

    <form>
        {#each descriptionMenacesEspèces as {classification, etresVivantsAtteints}}

        <section class={etreVivantClassificationToBloc.get(classification).sectionClass}>
            <h1>{etreVivantClassificationToBloc.get(classification).sectionTitre}</h1>

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
                                <AutocompleteEspeces bind:selectedItem={espece} espèces={espècesProtégéesParClassification.get(classification)} />
                            </td>
                            <td>
                                <select bind:value={activité}>
                                    <option>-</option>
                                    {#each activitesParClassificationEtreVivant.get(classification) || [] as act}
                                    <option value={act}>{act['étiquette affichée']}</option>
                                    {/each}
                                </select>
                            </td>
                            {#if classification !== "flore"}
                            <td>
                                <select bind:value={méthode} disabled={activité && activité['Méthode'] === 'n'}>
                                    <option>-</option>
                                    {#each méthodesParClassificationEtreVivant.get(classification) as met}
                                        <option value={met}>{met['étiquette affichée']}</option>
                                    {/each}
                                </select>
                            </td>
                            <td>
                                <select bind:value={transport} disabled={activité && activité['transport'] === 'n'}>
                                    <option>-</option>
                                    {#each transportsParClassificationEtreVivant.get(classification) as trans}
                                        <option value={trans}>{trans['étiquette affichée']}</option>
                                    {/each}
                                </select>
                            </td>
                            {/if}
                            <td><select bind:value={nombreIndividus}>
                                {#each fourchettesIndividus as fourchette}
                                    <option value={fourchette}>{fourchette}</option>
                                {/each}
                            </select></td>
                            {#if classification === "oiseau"}
                            <td><input type="number" bind:value={nombreNids} min="0" step="1"></td>
                            <td><input type="number" bind:value={nombreOeufs} min="0" step="1"></td>
                            {/if}
                            <td><input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1"></td>
                            <td><button type="button" on:click={() => supprimerLigne(etresVivantsAtteints, espece)}>❌</button></td>
                        </tr>
                    {/each}
                    <tr>
                        <td>
                            <AutocompleteEspeces bind:selectedItem={defaultSelectedItem} espèces={espècesProtégéesParClassification.get(classification)} onChange={esp => {ajouterEspèce(esp, classification, etresVivantsAtteints)}}/>
                        </td>
                        <td> <select disabled><option>- - - -</option></select> </td>
                        {#if classification !== "flore"}
                        <td> <select disabled><option>- - - -</option></select> </td>
                        <td> <select disabled><option>- - - -</option></select> </td>
                        {/if}
                        <td> <select disabled><option>- - - -</option></select> </td>
                        <td><input disabled type="number"></td>
                        {#if classification === "oiseau"}
                        <td><input disabled type="number"></td>
                        <td><input disabled type="number"></td>
                        {/if}
                        <td></td>
                    </tr>
                </tbody>
            </table>

            {#if etresVivantsAtteints.length >= 1}
            <section class="arrete-prefectoral">
                <h1>Liste des espèces</h1>
                {#each etresVivantsAtteints.toSorted(etresVivantsAtteintsCompareEspèce) as  {espece}, index }
                    {#if index !== 0 },&nbsp;{/if}{espece["NOM_VERN"]} (<i>{espece["LB_NOM"]}</i>)
                {/each} 
            </section>
            {/if}
        </section>
        
        {/each}
    </form>

    <section class="espece-manquante">
        <h1>ℹ️ Une espèce est manquante ?</h1>
        <p>Les listes d'espèces sont construites à partir des bases de données 
            <a href="https://inpn.mnhn.fr/telechargement/referentielEspece/referentielTaxo">TaxRef</a> et
            <a href="https://inpn.mnhn.fr/telechargement/referentielEspece/bdc-statuts-especes">Statuts des espèces</a>
            créées et distribuées par l'inventaire national du patrimoine naturel (INPN).<br>
            Nous listons les espèces qui ont un statut de protection de communauté de communes, départemental, régional
            ou national en droit français (loi, décision, arrêté, etc.) (statuts "POM", "PD", "PN", "PR")
        </p>
        <p>
            Et il est possible que vous souhaitiez indiquer une espèce qui est absente parce qu'elle manque dans la base de 
            données de l'INPN ou que nous avons oublié de rajouter.<br>
            Dans ce cas-là, vous pouvez <a href={mailto}>nous écrire un email à l'adresse especes-protegees@beta.gouv.fr</a>.<br>
            Vous aurez besoin de nous indiquer le <code>CD_NOM</code> de l'espèce que vous pouvez trouver sur 
            <a href="https://inpn.mnhn.fr/accueil/donnees-referentiels">le site de l'INPN</a>.<br>
            Par exemple, <a href="https://inpn.mnhn.fr/espece/cd_nom/4221">la Fauvette Pitchou a le <code>CD_NOM</code> 
                <code>4221</code></a>.
            Il s'agit toujours d'un nombre entre 1 et 8 chiffres.<br>
            
            Nous attendons aussi une justification légale qui peut être un article de loi ou la description d'un décret. 
            Quelques mots peuvent suffire.

        </p>
    </section>

    <section>
        <h1>Lien à copier</h1>
        <button on:click={créerLienPartage}>Créer un lien</button>
        <input bind:value={lienPartage} class="lien-partage" type="text" readonly> 
        <p>Vous pouvez ensuite copier ce lien dans le formulaire de demande de Dérogations Espèces Protégées</p>
    </section>
</article>


<style lang="scss">
	
	article{
        max-width: 90rem;
        margin: 0 auto;
        border-radius: 2em;
        padding: 1em 0;

        .saisie-oiseau, .saisie-flore, .saisie-faune {
            display: flex;
            flex-direction: column;
            align-items: flex-start;

            border: 1px solid grey;
            border-radius: 1em;
            padding: 1em;
            margin-bottom: 2em;

            select{
                max-width: 12rem;
            }

            &> h1{
                font-size: 1.3rem;
            }
            input[type="number"]{
                border-radius: 0.5em;
                padding: 0.4em;
                width: 5em;
            }

            label{
                & > strong{
                    display: inline-block;
                    min-width: 7em;

                    text-align: left;
                }

                select{
                    max-width: 30em;
                }
            }

            table{
                tr {
                    text-align: left;

                    th:not(:last-of-type){
                        padding-right: 1em;
                    }

                    td:nth-of-type(1){
                        width : 30rem;
                    }


                    td:last-of-type{
                        text-align: center;
                    }

                    button{
                        all: unset;
                        cursor: pointer;
                    }
                }
            }

            .arrete-prefectoral{
                padding: 1rem;
                margin: 1rem 0;
                border-radius: 1em;
                width: 100%;

                text-align: left;

                background-color: rgba(255, 255, 255, 0.4);
                
                h1{
                    font-size: 1.2em
                }


            }
        }

        .saisie-oiseau{
            background-color: lightblue;
        }

        .saisie-flore{
            background-color: lightgreen;
        }

        .saisie-faune{
            background-color: lightsalmon;
        }

        .espece-manquante{
            text-align: left;
        }

    }
	
</style>
