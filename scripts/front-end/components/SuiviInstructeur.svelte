<script>
    export let démarche = {}

    console.log('démarche', démarche)

    const pitchouKeyToChampDS = Object.assign(Object.create(null), {
        "SIRET": "Q2hhbXAtMzg5NzM5NA==",
        "Nom-Prénom": "Q2hhbXAtMzg5NzM1NA=="
    })

    $: dossiersAffichés = démarche.dossiers.nodes.map(({dateDepot, state, champs}) => {

        const SIRETChamp = champs.find(({id}) => id === pitchouKeyToChampDS["SIRET"])
        const NomPrenomChamp = champs.find(({id}) => id === pitchouKeyToChampDS["Nom-Prénom"])

        if(!SIRETChamp && !NomPrenomChamp) throw new TypeError(`Champ id ${pitchouKeyToChampDS["SIRET"]} et ${pitchouKeyToChampDS["Nom-Prénom"]} manquants (devrait être le Siret ou le prénom-nom de la personne)`)

        const nom = SIRETChamp ? 
            SIRETChamp.etablissement && `${SIRETChamp.etablissement.entreprise.raisonSociale} - (${SIRETChamp.etablissement.siret})` || `entreprise inconnue (SIRET: ${SIRETChamp.stringValue})` :
            NomPrenomChamp.stringValue

        return {
            statut: state,
            dateDepot,
            nom
        }
    })


</script>

<h1>Suivi instructeur</h1>

<table>
    <thead>
        <tr>
            <th>Statut</th>
            <th>Date de dépôt</th>
            <th>Identité pétitionnaire</th>
            <th>Activités de l'entreprise</th>
            <th>Espèces protégées concernées</th>
            <th>Enjeu écologique</th>
            <th>Enjeu politique</th>
        </tr>
    </thead>
    <tbody>
        {#each dossiersAffichés as {statut, dateDepot, nom}}
            <tr>
                <td>{statut}</td>
                <td>{dateDepot}</td>
                <td>{nom}</td>
            </tr>
        {/each}
    </tbody>

</table>