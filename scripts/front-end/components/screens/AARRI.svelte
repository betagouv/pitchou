<script>
    /** @import { IndicateursAARRI } from '../../..//types/API_Pitchou.ts' */
	/** @import { ComponentProps } from 'svelte' */
    import Squelette from '../Squelette.svelte'
    import Loader from '../Loader.svelte'

    /** @typedef {Omit<ComponentProps<typeof Squelette>, 'children'> & {indicateursP: Promise<IndicateursAARRI>}} Props */
        
    /** @type {Props} */
    let { email, erreurs, résultatsSynchronisationDS88444, indicateursP } = $props();

    const largeurBarreBase = 80;

</script>

<Squelette nav={true} title={'Suivi des indicateurs AARRI'} {email} {erreurs} {résultatsSynchronisationDS88444}>
    {#await indicateursP}
        <Loader></Loader>
    {:then indicateurs}
        <div class="fr-container fr-my-6w">
            <h1>Suivi des indicateurs AARRI</h1>
            <section class="fr-mt-4w">
                <h2>Etat des lieux</h2>
                <div class="conteneur-barres">
                    <div class="conteneur-barre">
                        <span class="étiquette-barre">Impact</span>
                        <div class="barre barre-impact" style={`width:${indicateurs.nombreUtilisateuriceImpact/indicateurs.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                    </div>
                    <div class="conteneur-barre">
                        <span class="étiquette-barre">Retenu.es</span>
                        <div class="barre barre-retenu" style={`width:${indicateurs.nombreUtilisateuriceRetenu/indicateurs.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                    </div>
                    <div class="conteneur-barre">
                        <span class="étiquette-barre">Actif.v.es</span>
                        <div class="barre barre-actif" style={`width:${indicateurs.nombreUtilisateuriceActif/indicateurs.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                    </div>
                    <div class="conteneur-barre">
                        <span class="étiquette-barre">Acquis.es</span>
                        <div class="barre barre-acquis" style={`width:${indicateurs.nombreUtilisateuriceAcquis/indicateurs.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                    </div>
                    <div class="conteneur-barre">
                        <span class="étiquette-barre">Base</span>
                        <div class="barre barre-base" style={`width:${largeurBarreBase}%`}></div>
                    </div>
                </div>
            </section>
        </div>
    {:catch error}
        <div class="fr-alert fr-alert--error fr-mb-3w">
            <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des groupes d'instructeurs :</h3>
            <p>{error.message}</p>
        </div>
    {/await}
</Squelette>

<style lang="scss">
    $couleur-base: var(--artwork-minor-blue-ecume);
    $couleur-acquis: var(--artwork-minor-brown-caramel);
    $couleur-actif: var(--artwork-minor-green-menthe);
    $couleur-retenu: var(--artwork-minor-yellow-moutarde);
    $couleur-impact: var(--artwork-minor-red-marianne); 
    
    .conteneur-barres {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .conteneur-barre {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start
    };

    .étiquette-barre {
        width: 5rem;
    }
    .barre {
        height: 40px;  
        &.barre-base {
            background-color: $couleur-base;
        }
        &.barre-acquis {
            background-color: $couleur-acquis;
        }
        &.barre-actif {
            background-color: $couleur-actif;
        }
        &.barre-retenu {
            background-color: $couleur-retenu;
        }
        &.barre-impact {
            background-color: $couleur-impact;
        }
    }
</style>

