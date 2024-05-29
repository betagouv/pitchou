<script>
    //@ts-check

    /** @type {import('../../types/database/public/Dossier.js').default[]} */
    export let dossiers = []

    console.log('dossiers', dossiers)

    function makeLocalisation({communes, départements, régions}){
        if(!communes && !départements && régions){
            return `Régions: ${régions.join(', ')}`
        }

        if(!communes && départements){
            return départements.join(', ')
        }

        if((!communes && !départements) || (communes.length === 0 && départements.length === 0)){
            return '(inconnue)'
        }

        return communes.map(({name}) => name).join(', ') + ' ' + `(${départements.join(', ')})`
    }

    function makeDemandeur({demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret}){
        if(demandeur_personne_physique_nom){
            return demandeur_personne_physique_nom + ' ' + demandeur_personne_physique_prénoms
        }
        else{
            if(demandeur_personne_morale_siret){
                return `${demandeur_personne_morale_raison_sociale} (${demandeur_personne_morale_siret})`
            }
            else
                return '(inconnu)'
        }
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
            <th>Demandeur de la dérogation</th>
            <th>Localisation</th>
            <th>Espèces protégées concernées</th>
            <th>Enjeu écologique</th>
        </tr>
    </thead>
    <tbody>
        {#each dossiers as { statut, date_dépôt, déposant_nom, déposant_prénoms, demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret, espèces_protégées_concernées, enjeu_écologiques, communes, départements, régions }}
            <tr>
                <td>{statut}</td>
                <td>{date_dépôt}</td>
                <td>{déposant_nom} {déposant_prénoms}</td>
                <td>{makeDemandeur({demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret})}</td>
                <td>{makeLocalisation({communes, départements, régions})}</td>
                <td>{espèces_protégées_concernées}</td>
                <td>{enjeu_écologiques}</td>
            </tr>
        {/each}
    </tbody>

</table>

<style>
    table{
        text-align: left;
    }

    tr{
        border: 1px solid #CCC;
        border-width: 1px 0;
    }

    td, th{
        vertical-align: top;
        padding: 0.3rem 0.6rem;
    }


</style>