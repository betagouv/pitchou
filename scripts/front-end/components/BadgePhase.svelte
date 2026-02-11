<script>
    /** @import { DossierPhase } from '../../types/API_Pitchou.ts' */

    /** @typedef Props
     * @property {DossierPhase} phase
    */

    /** @type {Props}*/
    let { phase } = $props()

    /** @type {Map<DossierPhase, string>} */
    const classParPhase = new Map([
        ['Accompagnement amont', 'fr-badge--yellow-tournesol'],
        ['Étude recevabilité DDEP', 'fr-badge--yellow-moutarde'],
        ['Instruction', 'fr-badge--blue-cumulus'],
        ['Contrôle', 'fr-badge--orange-terre-battue'],
        ['Classé sans suite', ''],
        ['Obligations terminées', 'fr-badge--beige-gris-galet']
    ])
</script>

<p class="fr-badge fr-badge--sm {classParPhase.get(phase)}">{phase}</p>