<script>
    //@ts-check
    import DownloadButton from '../DownloadButton.svelte';
    import Loader from '../Loader.svelte';
    import NomEspèce from '../NomEspèce.svelte';
    import {chargerActivitésMéthodesTransports, espècesImpactéesDepuisFichierOdsArrayBuffer} from '../../actions/dossier.js'
    import { etresVivantsAtteintsCompareEspèce } from '../../espèceFieldset';
    
    /** @import { ActivitéMenançante, EspèceProtégée, FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from '../../../types/especes.d.ts';*/

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    /** @type {ActivitéMenançante} */
    const ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION = {
        Code: 'mix-1-10-3-30-6-40',
        "étiquette affichée": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
        "Libellé long": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
        Espèces: 'faune non-oiseau', // champ inutilisé
        Méthode: 'n', // champ inutilisé
        transport: 'n' // champ inutilisé
    }

    /** @type {Promise<Map<ActivitéMenançante['Code'], ActivitéMenançante>>} */
    const activitéByCodeP = chargerActivitésMéthodesTransports()
        .then(({activités}) => 
            new Map([...activités.oiseau, ...activités['faune non-oiseau'], ...activités.flore])
        )

    const {number_demarches_simplifiées: numdos} = dossier

    const VALEUR_NON_RENSEIGNÉ = `(non renseigné)`


    /**
     * @param {OiseauAtteint} espèceImpactée
     * @returns {string}
     */
     function individus(espèceImpactée){
        return espèceImpactée.nombreIndividus || VALEUR_NON_RENSEIGNÉ
    }

    /**
     * @param {OiseauAtteint} espèceImpactée
     * @returns {string}
     */
    function surface(espèceImpactée){
        return espèceImpactée.surfaceHabitatDétruit ? `${espèceImpactée.surfaceHabitatDétruit}m²` : VALEUR_NON_RENSEIGNÉ
    }


    
    /** @type {Map<ActivitéMenançante['Code'] | undefined, Map<string, ((esp: any) => string)>>}  */
    let activitéVersDonnéesSecondaires = new Map([
        // 1, 10, 3, 30, 6, 40
        [ ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION.Code, new Map([ [ `Nombre d'individus`, individus ] ]) ],

        [ '2', new Map([ [ `Nombre d'individus`, individus ] ]) ],
        [ '4-1-pitchou-aires', new Map([ [ `Surface`, surface ] ]) ],
        [ '7', new Map([ [ `Nombre d'individus`, individus ] ]) ],

        [ '60', new Map([ [ `Surface`, surface ] ]) ],
        [ '80', new Map([ [ `Surface`, surface ] ]) ],
        [ undefined, new Map([ [ `Nombre d'individus`, individus ] ]) ]
    ])

    function makeFileContentBlob() {
        return new Blob(
            // @ts-ignore
            [dossier.espècesImpactées && dossier.espècesImpactées.contenu], 
            {type: dossier.espècesImpactées && dossier.espècesImpactées.media_type}
        )
    }

    function makeFilename() {
        return dossier.espècesImpactées?.nom || 'fichier'
    } 

    $: espècesImpactées = dossier.espècesImpactées && dossier.espècesImpactées.contenu && 
        // @ts-ignore
        espècesImpactéesDepuisFichierOdsArrayBuffer(dossier.espècesImpactées.contenu)

    /** @type {Promise<Map<ActivitéMenançante | undefined, {espèce: EspèceProtégée, détails: string[]}[] | undefined} */
    let espècesImpactéesParActivité

    $: espècesImpactéesParActivité = espècesImpactées && Promise.all([espècesImpactées, activitéByCodeP])
        .then(([espècesImpactées, activitéByCode]) => {
        /** @type {Map<ActivitéMenançante | undefined, {espèce: EspèceProtégée, détails: string[]}[]>} */
        const _espècesImpactéesParActivité = new Map()

        /**
         * 
         * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
         */
        function push(espèceImpactée){
            const activité = espèceImpactée.activité
            const esps = _espècesImpactéesParActivité.get(activité) || []
            const donnéesSecondaires = activitéVersDonnéesSecondaires.get(espèceImpactée.activité?.Code)

            if(!donnéesSecondaires){
                throw new Error(`Pas de données secondaires pour activité ${espèceImpactée.activité?.Code}`)
            }

            esps.push({
                espèce: espèceImpactée.espèce,
                détails: [...donnéesSecondaires.values()]
                    .map(funcDétail => funcDétail(espèceImpactée))
            })
            _espècesImpactéesParActivité.set(activité, esps)
        }

        if(espècesImpactées){
            for(const classif of (/** @type {const} */ (['oiseau', 'faune non-oiseau', 'flore']))){
                if(espècesImpactées[classif]){
                    for(const espèceImpactée of espècesImpactées[classif]){
                        const activité = espèceImpactée.activité
                        const code  = activité?.Code || ''
                        if(code === '4'){ // Destruction intentionnelle de nids, œufs, aires de repos ou reproduction
                            // séparer en sous-activités
                            if(espèceImpactée.surfaceHabitatDétruit){
                                push({
                                    ...espèceImpactée,
                                    activité: activitéByCode.get('4-1-pitchou-aires')
                                })
                            }

                            if(espèceImpactée.nombreNids){
                                push({
                                    ...espèceImpactée,
                                    activité: activitéByCode.get('4-2-pitchou-nids')
                                })
                            }

                            if(espèceImpactée.nombreOeufs){
                                push({
                                    ...espèceImpactée,
                                    activité: activitéByCode.get('4-3-pitchou-œufs')
                                }) 
                            }

                        }
                        else{
                            if(['1', '10', '3', '30', '6', '40'].includes(code)){
                                push({
                                    ...espèceImpactée,
                                    activité: ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION
                                })
                            }
                            else
                                push(espèceImpactée)
                        }
                    }
                }
            }

            for(const [activité, esps] of _espècesImpactéesParActivité){
                _espècesImpactéesParActivité.set(
                    activité, 
                    esps.toSorted(etresVivantsAtteintsCompareEspèce)
                )
            }

            return _espècesImpactéesParActivité
        }
    })
    .catch(err => console.error('err', err))

</script>

<section class="row">

    <section>
        <h2>Espèces impactées</h2>
        {#if dossier.espècesImpactées}
            <DownloadButton 
                {makeFileContentBlob}
                {makeFilename}
                classname="fr-btn fr-btn--secondary"
                label="Télécharger le fichier des espèces impactées"
            ></DownloadButton>

            {#await espècesImpactéesParActivité}
                <Loader></Loader>
            {:then espècesImpactéesParActivité} 
                {#if espècesImpactéesParActivité}
                {#each [...espècesImpactéesParActivité.entries()] as [activité, espècesImpactéesParCetteActivité]}
                    {@const donnéeRésiduellePourActivité = activitéVersDonnéesSecondaires.get(activité && activité.Code)}
                        <section class="liste-especes">
                            <h3>{activité ? activité['étiquette affichée'] : `Type d'impact non-renseignée`}</h3>
                            <table class="fr-table">
                                <thead>
                                    <tr>
                                        <th>Espèce</th>
                                        {#each donnéeRésiduellePourActivité.keys() as nomColonne}
                                            <th>{nomColonne}</th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each espècesImpactéesParCetteActivité as {espèce, détails} }
                                        <tr>
                                            <td><NomEspèce espèce={espèce}/></td>
                                            {#each détails as détail}
                                                <td>{détail}</td>
                                            {/each}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </section>
                    {/each}
                {/if}
            {:catch erreur}
                <div class="fr-alert fr-alert--error fr-mb-3w">
                    {#if erreur.name === 'HTTPError'}
                        Erreur de réception du fichier. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
                    {:else if erreur.name === 'MediaTypeError'}
                        Le fichier d'espèces impactées dans le dossier n'est pas d'un type qui permet de récupérer la liste des espèces.
                        Un fichier .ods est attendu. Le fichier dans le dossier est le type <code>{erreur.obtenu}</code>.
                        Vous pouvez demander au pétitionnaire de fournir le fichier dans le bon format à la place du fichier actuel.
                    {:else}
                        Une erreur est survenue. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
                    {/if}
                </div>
            {/await}

        {:else if dossier.espèces_protégées_concernées}
            <!-- Cette section est amenée à disparatre avec la fin de la transmission des espèces via un lien -->
            <p>Le pétitionnaire n'a pas encore transmis de fichier, mais il a transmis ceci :</p>
            
            <pre>{dossier.espèces_protégées_concernées}</pre>
            <p>
                <strong>Recommandation&nbsp;:</strong> l'inviter à plutôt transmettre 
                <a href="/saisie-especes">un fichier qu'il peut créer sur Pitchou</a>,
                puis déposer ce fichier au bon endroit sur son dossier sur Démarches Simplifiées
            </p>
        {:else}
            <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
        {/if}
    </section>

    <section>
        <h2>Dossier déposé</h2>
        <a class="fr-btn fr-mb-1w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
    </section>
</section>

<style lang="scss">

    .row{
        display: flex;
        flex-direction: row;

        &>:nth-child(1){
            flex: 3;
        }

        &>:nth-child(2){
            flex: 2;
        }
    }

    .liste-especes{
        margin-top: 2rem;
        margin-bottom: 2rem;

        h3{
            margin-bottom: 1rem;
        }
    }


    pre{
        white-space: pre-wrap;
    }
</style>
