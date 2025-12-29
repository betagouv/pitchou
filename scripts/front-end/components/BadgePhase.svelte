<script>
    /** @import { DossierPhase } from '../../types/API_Pitchou.ts' */

    /** @typedef Props
     * @property {DossierPhase} phase
    */

    /** @type {Props}*/
    let { phase } = $props()

    /** @type {Map<DossierPhase, string>} */
    const classParPhase = new Map([
        ['Accompagnement amont', 'fr-badge--green-tilleul-verveine'],
        ['Étude recevabilité DDEP', 'fr-badge--orange-terre-battue'],
        ['Instruction', 'fr-badge--blue-ecume'],
        ['Contrôle', 'fr-badge--pink-tuile'],
        ['Classé sans suite', ''],
        ['Obligations terminées', 'fr-badge--purple-glycine']
    ])
</script>

<p class="fr-badge {classParPhase.get(phase)}">{phase}</p>