<script>
    //@ts-check
    import EspècesImpactéesLecture from "../EspècesProtégéesGroupéesParImpact.svelte";
    import { créerEspècesGroupéesParImpact } from "../../actions/créerEspècesGroupéesParImpact.js";
    import { formatDateRelative } from "../../affichageDossier.js";
    import { chargerActivitésMéthodesTransports } from "../../actions/activitésMéthodesTransports.js";

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import {DescriptionMenacesEspèces} from '../../../types/especes.d.ts' */

    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     * @property {Promise<DescriptionMenacesEspèces> | undefined} espècesImpactées
     */

    /** @type {Props} */
    let { dossier, espècesImpactées } = $props();

    const { number_demarches_simplifiées: numdos, numéro_démarche } = dossier;

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

    const promesseRéférentiels = chargerActivitésMéthodesTransports();

    let espècesImpactéesParActivité =
        $derived(espècesImpactées && promesseRéférentiels
            ? Promise.all([espècesImpactées, promesseRéférentiels])
                .then(([espècesImpactées, { activitéVersImpactsQuantifiés }]) =>
                    créerEspècesGroupéesParImpact(espècesImpactées, activitéVersImpactsQuantifiés)
                )
            : undefined);

    $effect(() => {
        espècesImpactéesParActivité?.catch(err => console.error(`erreur lecture espèces`, err))
    })



    /** @type {{nom_complet:string,qualification:string}[]| undefined} */
    // @ts-ignore
    let scientifiquesIntervenants = dossier.scientifique_intervenants;

    /** @type {string[] | undefined} */
    // @ts-ignore
    let scientifiqueFinalitéDemande = dossier.scientifique_finalité_demande;
</script>

<section class="row">
    <section class="column">
        <h2>Informations du projet</h2>
        <p>
            <strong>Identifiant Pitchou&nbsp;:</strong>
            {dossier.id}
        </p>
        <p>
            <strong>Description&nbsp;:</strong>
            {dossier.description && dossier.description.length >= 1
                ? dossier.description
                : "Non renseignée"}
        </p>

        <p>
            <strong>Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet&nbsp;:</strong>
            {
                dossier.justification_absence_autre_solution_satisfaisante && dossier.justification_absence_autre_solution_satisfaisante.length >= 1 ? dossier.justification_absence_autre_solution_satisfaisante : `Non renseignée`
            }
        </p>

        <p>
            <strong>Motif de la dérogation&nbsp;:</strong>
            {
                dossier.motif_dérogation ?? `Non renseigné`
            }
        </p>

        <p>
            <strong>Synthèse des éléments justifiant le motif de la dérogation&nbsp;:</strong>
            {
                dossier.justification_motif_dérogation && dossier.justification_motif_dérogation.length >= 1 ? dossier.justification_motif_dérogation : `Non renseignée`
            }
        </p>

        <p>
            <strong>Date de début d'intervention ou des travaux&nbsp;:</strong>
            {#if dossier.date_début_intervention}
                <time datetime={dossier.date_début_intervention.toISOString()}>
                    {formatDateRelative(dossier.date_début_intervention)}
                </time>
            {:else}
                Non renseignée
            {/if}
        </p>

        <p>
            <strong>Date de fin d'intervention ou des travaux&nbsp;:</strong>
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
            <strong>Durée de la dérogation&nbsp;:</strong>
            {dossier.durée_intervention
                ? dossier.durée_intervention + " années"
                : "Non renseignée"}
        </p>

        <h2>Espèces impactées</h2>
        {#if dossier.espècesImpactées}
            <EspècesImpactéesLecture 
                {espècesImpactéesParActivité}
                {makeFileContentBlob}
            />
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

            <h3>Programme de suivi antérieur</h3>
            <p>
                {#if dossier.scientifique_bilan_antérieur === null}
                    Non renseigné
                {:else}
                    {dossier.scientifique_bilan_antérieur ? 'Oui' : 'Non'}
                {/if}
            </p>


            <h3>Finalité de la demande</h3>
            {#if Array.isArray(scientifiqueFinalitéDemande) && scientifiqueFinalitéDemande.length >= 1}
                <ul>
                    {#each scientifiqueFinalitéDemande as finalité}
                        <li>{finalité}</li>
                    {/each}
                </ul>
            {:else}
                Non renseigné
            {/if}


            <h3>Protocole de suivi</h3>
            <p>
                {dossier.scientifique_description_protocole_suivi ??
                    "Non renseigné"}
            </p>

            <h3>Méthodes</h3>

            <p>
                <strong> Modes de capture&nbsp;:</strong>
                {dossier.scientifique_mode_capture &&
                dossier.scientifique_mode_capture.length >= 1
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
                {#if scientifiquesIntervenants && scientifiquesIntervenants.length >= 1}
                    {#each scientifiquesIntervenants as { nom_complet, qualification }}
                        {nom_complet} - {qualification}
                    {/each}
                {:else}
                    Non renseigné.e.s
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
            href={`https://www.demarches-simplifiees.fr/procedures/${numéro_démarche}/dossiers/${numdos}`}
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

    pre {
        white-space: pre-wrap;
    }
</style>
