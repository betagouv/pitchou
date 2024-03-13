<script>
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import './types.js'
    
    let méthodes = [
        {id: '0'},
        {id: '1'},
        {id: '2'},
        {id: '3'},
        {id: '11'},
    ]
    
    let activités = [
        {id: '1'},
        {id: '2'},
        {id: '3'},
        {id: '60'},
        {id: '70'},
    ]

    export let espècesProtégéesParClassification;
    /** @type { DescriptionMenaceEspèce[] } */
    export let descriptionMenacesEspèces;

    console.log('descriptionMenacesEspèces', descriptionMenacesEspèces)

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

    let defaultSelectedItem = undefined
    $: defaultSelectedItem, defaultSelectedItem = undefined

    function ajouterEspèce(espèce, classification, etresVivantsAtteints){
        console.log('ajouterEspèce', ...arguments)
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

    function etresVivantsAtteintsCompareEspèce({espece: {NOM_VERN: nom1}}, {espece: {NOM_VERN: nom2}}) {
        if (nom1 < nom2) {
            return -1;
        }
        if (nom1 > nom2) {
            return 1;
        }
        return 0;
    }
                

</script>

<article>
    <h1>Saisie des espèces protégées</h1>
    <h2>et des activités et méthodes, etc.</h2>

    <form>
        {#each descriptionMenacesEspèces as {classification, etresVivantsAtteints, activité, méthode, transport}}
        
        <section class={etreVivantClassificationToBloc.get(classification).sectionClass}>
            <h1>{etreVivantClassificationToBloc.get(classification).sectionTitre}</h1>
        
            <table>
                <thead>
                    <tr>
                        <th>Espèce</th>
                        <th>Nombre d'individus</th>
                        {#if classification === "oiseau"}
                        <th>Nids</th>
                        <th>Œufs</th>
                        {/if}
                        <th>Surface habitat détruit (m²)</th>
                    </tr>
                </thead>
                <tbody>
                    {#each etresVivantsAtteints as {espece, nombreIndividus, surfaceHabitatDétruit, nombreNids, nombreOeufs}}
                        <tr>
                            <td>
                                <AutocompleteEspeces selectedItem={espece} espèces={espècesProtégéesParClassification.get(classification)} />
                            </td>
                            <td><input type="number" value={nombreIndividus} min="0" step="1"></td>
                            {#if classification === "oiseau"}
                            <td><input type="number" value={nombreNids} min="0" step="1"></td>
                            <td><input type="number" value={nombreOeufs} min="0" step="1"></td>
                            {/if}
                            <td><input type="number" value={surfaceHabitatDétruit} min="0" step="1"></td>
                        </tr>
                    {/each}
                    <tr>
                        <td>
                            <AutocompleteEspeces bind:selectedItem={defaultSelectedItem} espèces={espècesProtégéesParClassification.get(classification)} onChange={esp => {ajouterEspèce(esp, classification, etresVivantsAtteints)}}/>
                        </td>
                        <td><input disabled type="number" min="0" step="1"></td>
                        <td><input disabled type="number" min="0" step="1"></td>
                        {#if classification === "oiseau"}
                        <td><input disabled type="number" min="0" step="1"></td>
                        <td><input disabled type="number" min="0" step="1"></td>
                        {/if}
                    </tr>
                </tbody>
            </table>

            <label>
                Méthode
                <select>
                    <option>-</option>
                    {#each méthodes as {id}}
                        <option selected={méthode.toString() === id}>{id}</option>
                    {/each}
                </select>
            </label>

            <label>
                Activité
                <select>
                    <option>-</option>
                    {#each activités as {id}}
                    <option selected={activité.toString() === id}>{id}</option>
                    {/each}
                </select>
            </label>

            <label>
                Transport ?
                <select>
                    <option selected={transport}>Oui</option>
                    <option selected={!transport}>Non</option>
                </select>
            </label>
            <section class="arrete-prefectoral">
                <h1>Liste des espèces à copier pour l'arrêté préfectoral</h1>
                {#each etresVivantsAtteints.toSorted(etresVivantsAtteintsCompareEspèce) as  {espece}, index }
                    {#if index !== 0 },&nbsp;{/if}{espece["NOM_VERN"]} (<i>{espece["LB_NOM"]}</i>)
                {/each} 
            </section>
        </section>
        
        {/each}
    </form>
</article>


<style lang="scss">
	
	article{
        max-width: 60rem;
        margin: 0 auto;
        border: 1px solid grey;
        border-radius: 2em;
        padding: 1em 2em;

        .saisie-oiseau, .saisie-flore, .saisie-faune {
            display: flex;
            flex-direction: column;
            align-items: flex-start;

            border: 1px solid grey;
            border-radius: 1em;
            padding: 1em;
            margin-bottom: 2em;

            &> h1{
                font-size: 1.3rem;
            }
            input[type="number"]{
                border-radius: 0.5em;
                padding: 0.4em;
                width: 5em;
            }

            table{
                tr {
                    td:nth-of-type(1){
                        width : 30rem;
                    }
                    td:nth-of-type(2), td:nth-of-type(3), td:nth-of-type(4){
                        width : 6rem;
                    }
                }
            }

            .arrete-prefectoral{
                padding: 1rem;
                margin: 1rem 0;
                border-radius: 1em;
                width: 100%;

                text-align: left;

                background-color: hsla(255, 255, 255, 0.9);
                
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

    }
	
</style>
