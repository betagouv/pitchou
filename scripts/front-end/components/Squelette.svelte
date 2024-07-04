<script>
    /** @type {boolean} */
    export let nav = true;
</script>

<header class="fr-header">
    <div class="fr-header__body">
        <div class="fr-container">
            <div class="fr-header__body-row">
                <div class="fr-header__brand fr-enlarge-link">
                    <div class="fr-header__brand-top">
                        <div class="fr-header__logo">
                            <p class="fr-logo">
                                République
                                <br />Française
                            </p>
                        </div>
                    </div>
                    <div class="fr-header__service">
                        <a href="/" title="Accueil - Pitchou - DGALN">
                            <p class="fr-header__service-title">Pitchou</p>
                        </a>
                        <p class="fr-header__service-tagline">
                            Demandes de Dérogation Espèces Protégées
                        </p>
                    </div>
                </div>
                <!--
                <div class="fr-header__tools">
                    <div class="fr-header__tools-links">
                        <ul class="fr-btns-group">
                            <li>
                                <a class="fr-btn fr-icon-lock-line" href="[url - à modifier]">
                                    Se déconnecter
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                -->
            </div>
        </div>
    </div>
</header>

{#if nav}
    <nav class="fr-nav" id="navigation-773" aria-label="Menu principal">
        <ul class="fr-nav__list">
            <!--
            <li class="fr-nav__item">
                <button
                    class="fr-nav__btn"
                    aria-expanded="false"
                    aria-controls="menu-776"
                    aria-current="true">Entrée menu active</button
                >
                <div class="fr-collapse fr-menu" id="menu-776">
                    <ul class="fr-menu__list">
                        <li>
                            <a class="fr-nav__link" href="/saisie-especes"
                                >Saisie des</a
                            >
                        </li>
                        <li>
                            <a class="fr-nav__link" href="#"
                                >Lien de navigation</a
                            >
                        </li>
                    </ul>
                </div>
            </li>
            
            -->
            <li class="fr-nav__item">
                <a class="fr-nav__link" href="/">Tableau de suivi</a>
            </li>
            <li class="fr-nav__item">
                <a class="fr-nav__link" href="/saisie-especes">Saisie espèces protégées</a>
            </li>
            <li class="fr-nav__item">
                <button
                    class="fr-nav__btn"
                    aria-expanded="false"
                    aria-controls="menu-774">Import historique</button
                >
                <div class="fr-collapse fr-menu" id="menu-774">
                    <ul class="fr-menu__list">
                        <li>
                            <a class="fr-nav__link" href="/import-historique/nouvelle-aquitaine">
                                Import historique DREAL Nouvelle-Aquitaine
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
        </ul>
    </nav>
{/if}

<slot />

<footer class="fr-footer" id="footer">
    <div class="fr-container">
        <div class="fr-footer__body">
            <div class="fr-footer__brand fr-enlarge-link">
                <p class="fr-logo">République <br />Française</p>
                <!--
                <a
                    class="fr-footer__brand-link"
                    href="/"
                    title="Retour à l’accueil du site - République Française"
                >
                    <img
                        class="fr-footer__logo"
                        style="width:3.5rem;"
                        src="/example/img/placeholder.9x16.png"
                        alt="Logo DGALN"
                    />
                </a>
                -->
            </div>
            <div class="fr-footer__content">
                <!-- <p class="fr-footer__content-desc"></p> -->
                <ul class="fr-footer__content-list">
                    <li class="fr-footer__content-item">
                        <a
                            class="fr-footer__content-link"
                            target="_blank"
                            rel="noopener external"
                            title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
                            href="https://legifrance.gouv.fr"
                            >legifrance.gouv.fr</a
                        >
                    </li>
                    <li class="fr-footer__content-item">
                        <a
                            class="fr-footer__content-link"
                            target="_blank"
                            rel="noopener external"
                            title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
                            href="https://gouvernement.fr">gouvernement.fr</a
                        >
                    </li>
                    <li class="fr-footer__content-item">
                        <a
                            class="fr-footer__content-link"
                            target="_blank"
                            rel="noopener external"
                            title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
                            href="https://service-public.fr"
                            >service-public.fr</a
                        >
                    </li>
                    <li class="fr-footer__content-item">
                        <a
                            class="fr-footer__content-link"
                            target="_blank"
                            rel="noopener external"
                            title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
                            href="https://data.gouv.fr">data.gouv.fr</a
                        >
                    </li>
                </ul>
            </div>
        </div>
        <div class="fr-footer__bottom">
            <ul class="fr-footer__bottom-list">
                <li class="fr-footer__bottom-item">
                    <a class="fr-footer__bottom-link" href="https://github.com/betagouv/pitchou">Code source</a>
                </li>
                <li class="fr-footer__bottom-item">
                    <span class="fr-footer__bottom-link">
                        Accessibilité : non conforme
                    </span>
                </li>
                <!--<li class="fr-footer__bottom-item">
                    <a class="fr-footer__bottom-link" href="#"
                        >Mentions légales</a
                    >
                </li>-->
            </ul>
            <div class="fr-footer__bottom-copy">
                <p>
                    Sauf mention explicite de propriété intellectuelle détenue
                    par des tiers, les contenus de ce site sont proposés sous <a
                        href="https://github.com/etalab/licence-ouverte/blob/master/LO.md"
                        rel="noopener external"
                        title="Voir la licence Etalab 2.0 - nouvelle fenêtre"
                        target="_blank">licence etalab-2.0</a
                    >
                </p>
            </div>
        </div>
    </div>
</footer>

<style lang="scss">
    .fr-nav__item{
        // pour une raison pas claire, cette règle est annulée par une media query @media (min-width: 62em) 
        // et ça casse le menu.
        // Cette ligne le répare
        position: relative;
    }
</style>
