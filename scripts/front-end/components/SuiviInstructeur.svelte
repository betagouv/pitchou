<script>
    //@ts-check

    /** @type {import('../../types/database/public/Dossier.js').default[]} */
    export let dossiers = []

    console.log('dossiers', dossiers)

    function makeLocalisation(communes, départements){
        if(!communes && départements){
            return départements.join(', ')
        }

        if((!communes && !départements) || (communes.length === 0 && départements.length === 0)){
            return '(inconnue)'
        }

        return communes.map(({name}) => name).join(', ') + ' ' + `(${départements.join(', ')})`
    }



</script>

<nav>
    <a href="/saisie-especes">Saisie espèces</a>
</nav>

<h1>Suivi instructeur</h1>

<table>
    <thead>
        <tr>
            <th>Statut</th>
            <th>Date de dépôt</th>
            <th>Déposant</th>
            <th>Identité pétitionnaire</th>
            <th>Localisation</th>
            <th>Espèces protégées concernées</th>
            <th>Enjeu écologique</th>
        </tr>
    </thead>
    <tbody>
        {#each dossiers as { statut, date_dépôt, déposant_nom, déposant_prénoms, identité_petitionnaire, espèces_protégées_concernées, enjeu_écologiques, communes, départements }}
            <tr>
                <td>{statut}</td>
                <td>{date_dépôt}</td>
                <td>{déposant_nom} {déposant_prénoms}</td>
                <td>{identité_petitionnaire}</td>
                <td>{makeLocalisation(communes, départements)}</td>
                <td>{espèces_protégées_concernées}</td>
                <td>{enjeu_écologiques}</td>
            </tr>
        {/each}
    </tbody>

</table>