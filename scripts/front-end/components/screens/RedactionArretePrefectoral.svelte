<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttendue, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet, DossierPhaseEtProchaineAction} from '../../../types.js' */
    /** @import { ClassificationEtreVivant, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant,} from '../../../types/especes.d.ts' **/

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email

    const {espèces_protégées_concernées} = dossier

    /** @type {Map<ClassificationEtreVivant, EspèceProtégée[]>} */
    export let espècesProtégéesParClassification;

    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    export let activitesParClassificationEtreVivant

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    export let méthodesParClassificationEtreVivant

    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    export let transportsParClassificationEtreVivant

    throw `PPP - appeler la fonction qui lit le lien à partir du json, les espèces nia nia nia`

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Rédaction arrêté préfectoral - Dossier {dossier.nom_dossier || "sans nom"}</h1>

            <nav class="dossier-nav fr-mb-2w">
                <ul class="fr-btns-group fr-btns-group--inline-lg">
                    <li> 
                        <a class="fr-btn fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`}>Messagerie</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`/dossier/${dossier.id}/redaction-arrete-prefectoral`}>Rédaction arrêté préféctoral</a>
                    </li>
                </ul>
            </nav>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2>Liste des espèces protégées</h2>
                </section>
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);
    }

    section {
            margin-bottom: 3rem;
    }

    select {
        max-width: 90%;
    }

    nav.dossier-nav {
        display: flex;
        justify-content: flex-end;
    }
</style>
