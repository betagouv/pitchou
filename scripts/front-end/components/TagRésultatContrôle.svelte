<script>
    //@ts-check
  
    import clsx from 'clsx'

    /** @import { RésultatContrôle } from '../../types/API_Pitchou.ts' */
	

    

    // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

    

    
  /**
   * @typedef {Object} Props
   * @property {RésultatContrôle | string} résultatContrôle
   * @property {'SM' | 'MD'} [taille]
   * @property {string[]} [classes]
   */

  /** @type {Props} */
  let { résultatContrôle, taille = 'SM', classes = [] } = $props();

    /** @type {Map<RésultatContrôle, string>} */
    const résultatToClass = new Map([
        ['Conforme', 'résultat--conforme'],
        ['Non conforme', 'résultat--non-conforme'],
        ['Non conforme (Pas d\'informations reçues)', 'résultat--non-conforme-pas-information'],
        ['En cours', 'résultat--en-cours'],
        ['Trop tard', 'résultat--trop-tard']
    ])

    /** @type {Map<typeof taille, string>} */
    const tailleToClass = new Map([
        ['SM', 'fr-tag--sm'],
        ['MD', 'fr-tag--md']
    ])

    let allClasses = $derived([
        'fr-tag',
        tailleToClass.get(taille),
        // @ts-ignore
        résultatToClass.get(résultatContrôle) || 'résultat--autre',
        ...classes
    ])



</script>

<p class={clsx(allClasses)}>{résultatContrôle}</p>


<style lang="scss">
    $couleur-résultat-contrôle-conforme: var(--background-flat-success);
    $couleur-résultat-contrôle-non-conforme: var(--background-flat-error);
    $couleur-résultat-contrôle-autre: var(--background-flat-beige-gris-galet);

    p{
        // DSFR override
        &, &:hover{
            background-image: none;
        }

        &.résultat--en-cours,
        &.résultat--trop-tard,
        &.résultat--autre{
            background-color: $couleur-résultat-contrôle-autre;
            color: var(--text-inverted-beige-gris-galet);
        }
        
        &.résultat--conforme{
            background-color: $couleur-résultat-contrôle-conforme;
            color: var(--text-inverted-success);
        }

        &.résultat--non-conforme,
        &.résultat--non-conforme-pas-information{
            background-color: $couleur-résultat-contrôle-non-conforme;
            color: var(--text-inverted-error);
        }
    }
</style>
