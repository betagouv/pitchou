<script>
    //@ts-check
    import DownloadButton from "../DownloadButton.svelte";
    import Loader from "../Loader.svelte";
    import { créerEspècesGroupéesParImpact } from "../../actions/créerEspècesGroupéesParImpact.js";
    import { formatDateRelative } from "../../affichageDossier.js";

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import {DescriptionMenacesEspèces} from '../../../types/especes.d.ts' */

    /** @type {DossierComplet} */
    // @ts-ignore
    export let dossier;

    const { number_demarches_simplifiées: numdos } = dossier;

    function makeFileContentBlob() {
        return new Blob(
            // @ts-ignore
            [dossier.espècesImpactées && dossier.espècesImpactées.contenu],
            {
                type:
                    dossier.espècesImpactées &&
                    dossier.espècesImpactées.media_type,
            },
        );
    }

    function makeFilename() {
        return dossier.espècesImpactées?.nom || "fichier";
    }

    /** @type {Promise<DescriptionMenacesEspèces> | undefined} */
    export let espècesImpactées;

    /** @type {ReturnType<créerEspècesGroupéesParImpact> | undefined} */
    let espècesImpactéesParActivité;

    // @ts-ignore
    $: espècesImpactéesParActivité =
        espècesImpactées &&
        espècesImpactées.then(créerEspècesGroupéesParImpact);

    /** @type {{nom_complet:string,qualification:string}[]| undefined} */
    // @ts-ignore
    let scientifiquesIntervenants = dossier.scientifique_intervenants;
</script>

<section class="row">
    <section class="column">
        <h2>Informations du projet</h2>
        <p>
            <strong>Description&nbsp;:</strong>
            {dossier.description && dossier.description.length > 0
                ? dossier.description
                : "Non renseignée"}
        </p>

        <p>
            <strong>Date de début&nbsp;:</strong>
            {#if dossier.date_début_intervention}
                <time datetime={dossier.date_début_intervention.toISOString()}>
                    {formatDateRelative(dossier.date_début_intervention)}
                </time>
            {:else}
                Non renseignée
            {/if}
        </p>

        <p>
            <strong>Date de fin&nbsp;:</strong>
            {#if dossier.date_fin_intervention}
                <time
                    datetime={new Date(
                        dossier.date_fin_intervention,
                    ).toISOString()}
                >
                    {formatDateRelative(dossier.date_fin_intervention)}
                </time>
            {:else}
                Non renseignée
            {/if}
        </p>

        <p>
            <strong>Durée de l'intervention&nbsp;:</strong>
            {dossier.durée_intervention
                ? dossier.durée_intervention + " années"
                : "Non renseignée"}
        </p>

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
                    {#each espècesImpactéesParActivité as { activité, espèces, impactsRésiduels }}
                        <section class="liste-especes">
                            <h3>{activité}</h3>
                            <table class="fr-table">
                                <thead>
                                    <tr>
                                        <th>Espèce</th>
                                        {#if impactsRésiduels && impactsRésiduels.length >= 1}
                                            {#each impactsRésiduels as nomColonne}
                                                <th>{nomColonne}</th>
                                            {/each}
                                        {/if}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each espèces as { nomVernaculaire, nomScientifique, détails }}
                                        <tr>
                                            <td
                                                >{nomVernaculaire} (<i
                                                    >{nomScientifique}</i
                                                >)</td
                                            >
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
                <div class="fr-alert fr-alert--error fr-mb-3w fr-mt-2w">
                    {#if erreur.name === "HTTPError"}
                        Erreur de réception du fichier. Veuillez réessayer en
                        rafraichissant la page maintenant ou plus tard.
                    {:else if erreur.name === "MediaTypeError"}
                        Le fichier d'espèces impactées dans le dossier n'est pas
                        d'un type qui permet de récupérer la liste des espèces.
                        Un fichier <code>{erreur.attendu}</code>
                        est attendu. Le fichier dans le dossier est de type
                        <code>{erreur.obtenu}</code>. Vous pouvez demander au
                        pétitionnaire de fournir le fichier dans le bon format à
                        la place du fichier actuel.
                    {:else}
                        Une erreur est survenue. Veuillez réessayer en
                        rafraichissant la page maintenant ou plus tard.
                    {/if}
                </div>
            {/await}
        {:else if dossier.espèces_protégées_concernées}
            <!-- Cette section est amenée à disparatre avec la fin de la transmission des espèces via un lien -->
            <p>
                Le pétitionnaire n'a pas encore transmis de fichier, mais il a
                transmis ceci&nbsp;:
            </p>

            <pre>{dossier.espèces_protégées_concernées}</pre>
            <p>
                <strong>Recommandation&nbsp;:</strong> l'inviter à plutôt
                transmettre
                <a href="/saisie-especes"
                    >un fichier qu'il peut créer sur Pitchou</a
                >, puis déposer ce fichier au bon endroit sur son dossier sur
                Démarches Simplifiées
            </p>
        {:else}
            <p>
                Aucune données sur les espèces impactées n'a été fournie par le
                pétitionnaire
            </p>
        {/if}

        {#if dossier.scientifique_type_demande}
            <h2>Données scientifiques</h2>
            <h3>Type de demande</h3>
            <ul>
                {#each dossier.scientifique_type_demande as typeDemande}
                    <li>{typeDemande}</li>
                {/each}
            </ul>

            <h3>Protocole de suivi</h3>
            <p>
                {dossier.scientifique_description_protocole_suivi ??
                    "Non renseigné"}
            </p>

            <h3>Méthodes</h3>

            <p>
                <strong> Modes de capture&nbsp;:</strong>
                {dossier.scientifique_mode_capture &&
                dossier.scientifique_mode_capture.length
                    ? dossier.scientifique_mode_capture.join(", ")
                    : "Non renseignées"}
            </p>
            <p>
                <strong> Source lumineuse&nbsp;:</strong>
                {dossier.scientifique_modalités_source_lumineuses ??
                    "Non renseignée"}
            </p>
            <p>
                <strong> Marquage&nbsp;:</strong>
                {dossier.scientifique_modalités_marquage ?? "Non renseigné"}
            </p>
            <p>
                <strong> Transport&nbsp;:</strong>
                {dossier.scientifique_modalités_transport ?? "Non renseigné"}
            </p>

            <h3>Périmètre et intervenant.e.s</h3>
            <p>
                <strong>
                    Périmètre&nbsp;:
                </strong>{dossier.scientifique_périmètre_intervention ??
                    "Non renseigné"}
            </p>
            <p>
                <strong> Intervenant.e.s&nbsp;: </strong>
                {#if scientifiquesIntervenants}
                    {#each scientifiquesIntervenants as { nom_complet, qualification }}
                        {nom_complet} - {qualification}
                    {/each}
                {:else}
                    Non renseignés
                {/if}
            </p>
            <p>
                <strong>
                    Précisions&nbsp;:
                </strong>{dossier.scientifique_précisions_autres_intervenants ??
                    "Non renseignées"}
            </p>
        {/if}
    </section>

    <section>
        <h2>Dossier déposé</h2>
        <a
            class="fr-btn fr-mb-1w"
            target="_blank"
            href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}
            >Dossier sur Démarches Simplifiées</a
        >
    </section>
</section>

<style lang="scss">
    .column {
        h2 {
            margin-top: 3rem;
        }
        & > :nth-child(1) {
            margin-top: 0;
        }
    }
    .row {
        display: flex;
        flex-direction: row;

        & > :nth-child(1) {
            flex: 3;
        }

        & > :nth-child(2) {
            flex: 2;
        }
    }

    .liste-especes {
        margin-top: 2rem;
        margin-bottom: 2rem;

        h3 {
            margin-bottom: 1rem;
        }
    }

    pre {
        white-space: pre-wrap;
    }
</style>
