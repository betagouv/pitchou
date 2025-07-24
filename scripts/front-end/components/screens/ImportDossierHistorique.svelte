<script>
    //@ts-check
    import Squelette from "../Squelette.svelte";
    /** @type {string | undefined} */
    export let email = undefined;
</script>

<Squelette {email} nav={true}>
    <h1>Import des dossiers historiques</h1>
    <!-- svelte-ignore a11y-no-redundant-roles -->
    <nav
        class="fr-nav"
        id="navigation-links-0"
        role="navigation"
        aria-label="Menu principal"
    >
        <ul class="fr-nav__list">
            <li class="fr-nav__item">
                <a
                    id="navigation-item-nav-links-1"
                    type="link"
                    href="/import-dossier-historique/bourgogne-franche-comte"
                    class="fr-nav__link">Bourgogne-Franche-Comté</a
                >
            </li>
        </ul>
    </nav>
</Squelette>
