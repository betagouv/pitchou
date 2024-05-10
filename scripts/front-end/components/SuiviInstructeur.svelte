<script>
    import '../../types/database/public/Dossier.js'

    /** @type {Dossier[]} */
    export let dossiers = []

    console.log('dossiers', dossiers)


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
            <th>Identité pétitionnaire</th>
            <th>Espèces protégées concernées</th>
            <th>Enjeu écologique</th>
        </tr>
    </thead>
    <tbody>
        {#each dossiers as { statut, date_dépôt, identité_petitionnaire, espèces_protégées_concernées, enjeu_écologiques }}
            <tr>
                <td>{statut}</td>
                <td>{date_dépôt}</td>
                <td>{identité_petitionnaire}</td>
                <td>{espèces_protégées_concernées}</td>
                <td>{enjeu_écologiques}</td>
            </tr>
        {/each}
    </tbody>

</table>