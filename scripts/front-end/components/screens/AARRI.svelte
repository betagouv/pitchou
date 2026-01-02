<script>
	/** @import { ComponentProps } from 'svelte' */
    import Squelette from '../Squelette.svelte'

    /** @typedef {Omit<ComponentProps<typeof Squelette>, 'children'>} Props */
        
    /** @type Props */
    let { email, erreurs, résultatsSynchronisationDS88444 } = $props();
</script>

<Squelette nav={true} title={'Suivi des indicateurs AARRI'} {email} {erreurs} {résultatsSynchronisationDS88444}>
    <div class="fr-container fr-my-6w">
        <h1>Suivi des indicateurs AARRI</h1>
        <p>Contenu de la page AARRI à venir.</p>
    </div>
</Squelette>

