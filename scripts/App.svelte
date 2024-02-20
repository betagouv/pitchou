<script>
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import './types.js'
    
    export let méthodes = [
        {id: '0'},
        {id: '1'},
        {id: '2'},
        {id: '3'},
        {id: '11'},
    ]
    
    export let activités = [
        {id: '1'},
        {id: '2'},
        {id: '3'},
        {id: '60'},
        {id: '70'},
    ]

    export let espèces;
    /** @type { DescriptionMenaceEspèce[] } */
    export let descriptionMenacesEspèces = [
        {
            type: "oiseau", // Type d'espèce menacée
            etresVivantsAtteints: [
                {
                    espece: "Moineau domestique",
                    nombreIndividus: 1000
                },
                {
                    espece: "Hirondelle rustique",
                    nombreIndividus: 500
                }
            ],
            surfaceHabitatDétruit: 1000, // Surface de l'habitat détruit
            activité: 3, // Activité menaçante
            méthode: 11, // Méthode menaçante
            transport: true // Transport impliqué dans la menace
        }
    ]

    const etreVivantTypeToBloc = new Map([
        ["oiseau", {
            sectionClass: "saisie-oiseau",
            sectionTitre: `Ensemble d'oiseaux protégés 🐦`
        }],
        ["faune non-oiseau", {
            sectionClass: "saisie-faune",
            sectionTitre: `Ensemble d'animaux (non-oiseaux) protégés 🐸`
        }],
        ["flore", {
            sectionClass: "saisie-flore",
            sectionTitre: `Ensemble de végétaux protégés 🍀`
        }]
    ])


</script>

<article>
    <h1>Saisie des espèces protégées</h1>
    <h2>et des activités et méthodes, etc.</h2>

    <form>
        {#each descriptionMenacesEspèces as {type, etresVivantsAtteints, surfaceHabitatDétruit, activité, méthode, transport}}
        
        <section class={etreVivantTypeToBloc.get(type).sectionClass}>
            <h1>{etreVivantTypeToBloc.get(type).sectionTitre}</h1>
        
            <table>
                <thead>
                    <tr>
                        <th>Espèce</th>
                        <th>Nombre d'individus</th>
                        {#if type === "oiseau"}
                        <th>Nids</th>
                        <th>Œufs</th>
                        {/if}
                    </tr>
                </thead>
                <tbody>
                    {#each etresVivantsAtteints as {espece, nombreIndividus}}
                        <tr>
                            <td>{espece}</td>
                            <td><input type="number" value={nombreIndividus} min="0" step="1"></td>
                            {#if type === "oiseau"}
                            <td><input type="number" min="0" step="1"></td>
                            <td><input type="number" min="0" step="1"></td>
                            {/if}
                        </tr>
                    {/each}
                    <tr>
                        <td>
                            <AutocompleteEspeces {espèces}></AutocompleteEspeces>
                        </td>
                        <td><input disabled type="number" min="0" step="1"></td>
                        {#if type === "oiseau"}
                        <td><input disabled type="number" min="0" step="1"></td>
                        <td><input disabled type="number" min="0" step="1"></td>
                        {/if}
                    </tr>
                </tbody>
            </table>

            <label>
                Surface habitat détruit (m²)
                <input value={surfaceHabitatDétruit} type="number" min="0" step="1">
            </label>

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

        .saisie-oiseau {
            display: flex;
            flex-direction: column;
            align-items: flex-start;

            border: 1px solid grey;
            border-radius: 1em;
            padding: 1em;

            background-color: lightblue;

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
                    td:nth-of-type(2), td:nth-of-type(3), td:nth-of-type(4){
                        width : 6rem;
                    }
                }
            }
        }

    }
	
</style>
