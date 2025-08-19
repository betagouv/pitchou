<script>
    //@ts-check
  
	
    

    // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

    

    
  /**
   * @typedef {Object} Props
   * @property {'écologique' | 'politique'} enjeu
   * @property {'SM' | 'MD'} [taille]
   * @property {string[]} [classes]
   */

  /** @type {Props} */
  let { enjeu, taille = 'MD', classes = [] } = $props();

    /** @type {Map<typeof enjeu, string>} */
    const enjeuToClass = new Map([
        ['écologique', 'enjeu--écologique'],
        ['politique', 'enjeu--politique'],
    ])

    /** @type {Map<typeof taille, string>} */
    const tailleToClass = new Map([
        ['SM', 'fr-tag--sm'],
        ['MD', 'fr-tag--md']
    ])

    let allClasses = $derived([
        'fr-tag',
        tailleToClass.get(taille),
        enjeuToClass.get(enjeu),
        ...classes
    ].filter(x => !!x))

</script>

<p class={allClasses.join(' ')}>{enjeu}</p>

<style lang="scss">
    $couleur-enjeu-écologique: var(--background-flat-green-emeraude);
    $couleur-enjeu-politique: var(--background-flat-blue-ecume);

    p{
        white-space: nowrap;
    }

    p{
        &.enjeu--écologique{
            background-color: $couleur-enjeu-écologique;
            color: var(--text-inverted-blue-ecume);
        }
        &.enjeu--politique{
            background-color: $couleur-enjeu-politique;
            color: var(--text-inverted-green-emeraude);
        }
    }
</style>
