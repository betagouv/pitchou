<script>
    /** @import { IndicateursAARRI } from '../../..//types/API_Pitchou.ts' */
	/** @import { ComponentProps } from 'svelte' */
    import Squelette from '../Squelette.svelte'
    import Loader from '../Loader.svelte'
	import { formatDateAbsolue } from '../../affichageDossier.js'
	import { isSameDay } from 'date-fns'

    /** @typedef {Omit<ComponentProps<typeof Squelette>, 'children'> & {indicateursParDateP: Promise<IndicateursAARRI[]>}} Props */
        
    /** @type {Props} */
    let { email, erreurs, résultatsSynchronisationDS88444, indicateursParDateP } = $props();

    let indicateursAujourdhuiP = $derived(indicateursParDateP.then((indicateursParDate) => indicateursParDate[0]))

    let dateChoisie = $state()

    indicateursParDateP.then((indicateursParDate) => dateChoisie = indicateursParDate[1].date)

    const largeurBarreBase = 80;
    

</script>

<Squelette nav={true} title={'Suivi des indicateurs AARRI'} {email} {erreurs} {résultatsSynchronisationDS88444}>
    <div class="fr-container fr-my-6w">
        <h1>Suivi des indicateurs AARRI</h1>
        
        {#await indicateursAujourdhuiP}
            <Loader></Loader>
        {:then indicateursAujourdhui}
            <section class="fr-mt-4w">
                <h2>État des lieux</h2>
                <p>Voici la valeur des nombres d'utilisateurices Pitchou par pour chaque phase AARRI aujourd'hui.</p>
                <div class="conteneur-barres">
                    <div class="fr-grid-row fr-grid-row--middle">
                        <span class="fr-col-1">Impact</span>
                        <div class="barre barre-impact" style={`width:${indicateursAujourdhui.nombreUtilisateuriceImpact/indicateursAujourdhui.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                        <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceImpact}</span>
                    </div>
                    <div class="fr-grid-row fr-grid-row--middle">
                        <span class="fr-col-1">Retenu</span>
                        <div class="barre barre-retenu" style={`width:${indicateursAujourdhui.nombreUtilisateuriceRetenu/indicateursAujourdhui.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                        <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceRetenu}</span>
                    </div>
                    <div class="fr-grid-row fr-grid-row--middle">
                        <span class="fr-col-1">Actif</span>
                        <div class="barre barre-actif" style={`width:${indicateursAujourdhui.nombreUtilisateuriceActif/indicateursAujourdhui.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                        <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceActif}</span>
                    </div>
                    <div class="fr-grid-row fr-grid-row--middle">
                        <span class="fr-col-1">Acquis</span>
                        <div class="barre barre-acquis" style={`width:${indicateursAujourdhui.nombreUtilisateuriceAcquis/indicateursAujourdhui.nombreBaseUtilisateuricePotentielle*largeurBarreBase}%`}></div>
                        <span class="fr-ml-1w">{indicateursAujourdhui.nombreUtilisateuriceAcquis}</span>
                    </div>
                    <div class="fr-grid-row fr-grid-row--middle">
                        <span class="fr-col-1">Base</span>
                        <div class="barre barre-base" style={`width:${largeurBarreBase}%`}></div>
                        <span class="fr-ml-1w">{indicateursAujourdhui.nombreBaseUtilisateuricePotentielle}</span>
                    </div>
                </div>
            </section>
            <section class="fr-mt-4w">
                <h2>Notre démarche</h2>
                <p>À compléter</p>
            </section>
            {#await indicateursParDateP}
                <Loader></Loader>
            {:then indicateursParDate}
                {@const dates = indicateursParDate.slice(1).map((indicateurs) => indicateurs.date)}
                {@const indicateurDateChoisie = indicateursParDate.find((indicateurs) => isSameDay(indicateurs.date, dateChoisie))} 
                {@const diffIndicateurImpact = indicateursAujourdhui.nombreUtilisateuriceImpact-(indicateurDateChoisie?.nombreUtilisateuriceImpact ?? 0)}
                {@const diffIndicateurRetenu = indicateursAujourdhui.nombreUtilisateuriceRetenu-(indicateurDateChoisie?.nombreUtilisateuriceRetenu ?? 0)}
                {@const diffIndicateurActif = indicateursAujourdhui.nombreUtilisateuriceActif-(indicateurDateChoisie?.nombreUtilisateuriceActif ?? 0)}
                {@const diffIndicateurAcquis = indicateursAujourdhui.nombreUtilisateuriceAcquis-(indicateurDateChoisie?.nombreUtilisateuriceAcquis ?? 0)}
                                                                
                <section class="fr-mt-4w">
                    <h2>Évolution</h2>
                    <div class="fr-select-group">
                    <label class="fr-label" for="select-1"> Liste des dates possibles </label>
                    <select bind:value="{dateChoisie}" class="fr-select" aria-describedby="select-1-messages" id="select-1" name="select-1">
                        <option value="" selected disabled>Sélectionnez une date</option>
                        {#each dates as date}
                            <option value={date}>{formatDateAbsolue(date)}</option>
                        {/each}
                    </select>
                    <div class="fr-messages-group" id="select-1-messages" aria-live="polite">
                    </div>
                    </div>

                    {#if dateChoisie}
                        <div class="fr-table" id="table-0-component">
                        <div class="fr-table__wrapper">
                            <div class="fr-table__container">
                            <div class="fr-table__content">
                                <table id="table-0">
                                <caption> Évolution du nombre d'utilisateurice par phase </caption>
                                <thead>
                                    <tr>
                                    <th>Phase</th>
                                    <th> {formatDateAbsolue(dateChoisie)} </th>
                                    <th> Aujourd'hui </th>
                                    <th> Évolution </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr id="table-0-row-key-1" data-row-key="1">
                                    <td> Impact </td>
                                    <td> {indicateurDateChoisie?.nombreUtilisateuriceImpact} </td>
                                    <td> {indicateursAujourdhui.nombreUtilisateuriceImpact} </td>
                                    <td> {`${diffIndicateurImpact > 0 ? '+' : ''} ${diffIndicateurImpact}`} </td>
                                    </tr>
                                </tbody>
                                <tbody>
                                    <tr id="table-0-row-key-2" data-row-key="2">
                                    <td> Retenu </td>
                                    <td> {indicateurDateChoisie?.nombreUtilisateuriceRetenu} </td>
                                    <td> {indicateursAujourdhui.nombreUtilisateuriceRetenu} </td>
                                    <td> {`${diffIndicateurRetenu > 0 ? '+' : ''} ${diffIndicateurRetenu}`} </td>
                                    </tr>
                                </tbody>
                                <tbody>
                                    <tr id="table-0-row-key-3" data-row-key="3">
                                    <td> Actif </td>
                                    <td> {indicateurDateChoisie?.nombreUtilisateuriceActif} </td>
                                    <td> {indicateursAujourdhui.nombreUtilisateuriceActif} </td>
                                    <td> {`${diffIndicateurActif > 0 ? '+' : ''} ${diffIndicateurActif}`} </td>
                                    </tr>
                                </tbody>
                                <tbody>
                                    <tr id="table-0-row-key-4" data-row-key="4">
                                    <td> Acquis </td>
                                    <td> {indicateurDateChoisie?.nombreUtilisateuriceAcquis} </td>
                                    <td> {indicateursAujourdhui.nombreUtilisateuriceAcquis} </td>
                                    <td> {`${diffIndicateurAcquis > 0 ? '+' : ''} ${diffIndicateurAcquis}`} </td>
                                    </tr>
                                </tbody>
                                </table>
                            </div>
                            </div>
                        </div>
                        </div>
                    {/if}

                </section>
            {/await}
        {/await}
    </div>
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

