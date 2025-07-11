<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import TagPhase from '../TagPhase.svelte'

    /** @import {DossierRésumé} from '../../../types/API_Pitchou.ts' */ 

    /** @type {DossierRésumé[]} */
    export let dossiers = []

    /** @type {string | undefined} */
    export let email = undefined

    /**
     * Trouve tous les dossiers en phase contrôle
     * @param {DossierRésumé[]} dossiers 
     * @returns {DossierRésumé[]}
     */
    function trouverDossiersEnContrôle(dossiers) {
        return dossiers.filter(dossier => dossier.phase === 'Contrôle')
    }

    /**
     * Trouve les dossiers en phase contrôle qui ont au moins une décision administrative
     * @param {DossierRésumé[]} dossiers 
     * @returns {DossierRésumé[]}
     */
    function trouverDossiersEnContrôleAvecDécision(dossiers) {
        return dossiers.filter(dossier => 
            dossier.phase === 'Contrôle' && 
            dossier.décisionsAdministratives && 
            dossier.décisionsAdministratives.length > 0
        )
    }

    $: dossiersEnPhaseContrôle = trouverDossiersEnContrôle(dossiers)
    $: dossiersEnPhaseContrôleAvecDécision = trouverDossiersEnContrôleAvecDécision(dossiers)
    $: dossiersEnPhaseContrôleSansDécision = dossiersEnPhaseContrôle.length - dossiersEnPhaseContrôleAvecDécision.length
</script>

<Squelette {email} nav={false}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Pitchou - Statistiques publiques</h1>
                <p class="fr-text--lg fr-mb-0">
                    Ces données statistiques sont basées sur <strong>{dossiers.length} dossiers au total</strong> et concernent le déploiement en <strong>Nouvelle-Aquitaine</strong>.
                </p>
            </header>

            <section>
                <h2 class="fr-mt-2w">Dossiers en phase contrôle</h2>
                <div class="fr-card fr-card--no-arrow">
                    <div class="fr-card__header">
                        <div class="fr-card__content">
                            <h3 class="fr-card__title">
                                Répartition des dossiers en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase>
                            </h3>
                        </div>
                    </div>
                    <div class="fr-card__body">
                        <div class="fr-card__content">
                            <p class="fr-text--sm fr-mb-2w">
                                Une <strong>décision administrative</strong> correspond à un arrêté de dérogation, un arrêté de refus, un arrêté modificatif ou tout autre document administratif finalisant l'instruction du dossier.
                            </p>

                            <div class="fr-grid-row fr-grid-row--gutters">
                                <div class="fr-col-4">
                                    <div class="stat-item">
                                        <span class="stat-number">{dossiersEnPhaseContrôleAvecDécision.length}</span>
                                        <span class="stat-label">Avec décision administrative</span>
                                    </div>
                                </div>
                                <div class="fr-col-4">
                                    <div class="stat-item">
                                        <span class="stat-number">{dossiersEnPhaseContrôleSansDécision}</span>
                                        <span class="stat-label">Sans décision administrative</span>
                                    </div>
                                </div>
                                <div class="fr-col-4">
                                    <div class="stat-item total-stat">
                                        <span class="stat-number">{dossiersEnPhaseContrôle.length}</span>
                                        <span class="stat-label">Total</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </article>
    </div>
</Squelette>

<style lang="scss">
    .fr-card {
        border: 1px solid var(--border-default-grey);
        border-radius: 8px;
        padding-inline: 1.5rem;
    }

    .fr-card__title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1rem;
        background-color: var(--background-alt-grey);
        border-radius: 6px;
    }

    .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: var(--text-default-info);
        display: block;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--text-mention-grey);
        margin-top: 0.25rem;
    }

    .stat-item.total-stat {
        background-color: var(--background-action-high-blue-france);
        color: white;
    }

    .stat-item.total-stat .stat-number {
        color: white;
    }

    .stat-item.total-stat .stat-label {
        color: white;
    }
</style>
