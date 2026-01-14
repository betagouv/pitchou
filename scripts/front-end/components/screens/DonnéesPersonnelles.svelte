<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
</script>

{#snippet DDEP()}
DDEP (Demande de Dérogation Espèces Protégées)
{/snippet}

<Squelette nav={false} title="Données personnelles">
    <div class="fr-container fr-mt-2w fr-mb-6w">
        <h1>Données personelles</h1>

        <p>
            <a href="https://beta.gouv.fr/startups/pitchou.html">Pitchou est une startup d'État</a> qui 
            fabrique notamment un produit numérique à destination des pétitionnaires
            (personnes physiques ou morales qui déposent des demandes de dérogation espèces protégées (DDEP))
            et des instructeurs·rices espèces protégées dans différentes DREAL et DDT(M) qui gèrent et instruisent 
            ces demandes.
        </p>
        <p>Ce produit numérique collecte et traite des données à caractère personnelles (au sens de 
            <a href="https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre1#Article4">l'article 4.1 
                du RGPD (Règlement Général sur la Protection des Données)</a>)

        <p>Cette page liste les données collectées pour les pétitionnaires et les instructrices et explique leur traitement</p>

        <h2>Données personnelles collectées</h2>

        <h3>Pour les pétitionnaires</h3>
        <h4>Données collectées</h4>
        <p>
            Pour les pétitionnaires, les données personnelles collectées se restreignent strictement aux données du 
            dossier déposé et aux échanges par messagerie avec les instructeurs·rices {@render DDEP()}.
            
        </p>

        <h4>Traitement</h4>
        <p>
            Leur traitement est restreint strictement à ce qui est nécessaire pour mener à bien l'instruction du dossier.
            Des statistiques anonymisées peuvent aussi avoir lieu ponctuellement.
        </p>

        <h4>Licéité</h4>
        <p>
            Les traitements sont nécessaires à l'exécution de la mission de service publique qu'est l'instruction des dossiers
            {@render DDEP()}
        </p>

        <h4>Durée de conservation</h4>
        <p>
            Les dossiers sont conservés toute la durée du leur instruction 
            (à titre indicatif, cette durée est typiquement entre 3 mois et 2 ans).
        </p>
        <p>
            Dans le cas où le dossier fait l'objet d'une dérogation, il est conservé tout le temps d'exécution de la dérogation 
            (à titre indicatif, cette durée est typiquement entre 1 et 30 ans selon les dossiers 
            et les mesures de compensation choisies)
        </p>
        <p>
            Dans tous les cas, les données sont conservées 5 ans après la clôture du dossier au cas où une procédure contentieux 
            à propos de l'instruction {@render DDEP()} aurait lieu
        </p>

        <h3>Pour les instructeur.rices</h3>
        <h4>Données collectées</h4>
        <p>
            Pitchou collecte les données personnelles liées au travail d'instruction des dossiers (par exemple, si une instructrice suit un dossier, 
            nous stockons qu'elle suit le dossier pour pouvoir lui fournir la liste des dossiers qu'elle suit)
        </p>
        <p>
            Pitchou collecte aussi des données d'activité des actions suivantes : 
        </p>
        <ul>
            <li>chercher un dossier (recherche + filtres)</li>
            <li>accéder aux nouveaux dossiers déposés</li>
            <li>afficher les dossiers que je suis</li>
            <li>accéder au dossier et ses pièces jointes</li>
            <li>accéder à la liste d’espèces et télécharger la liste</li>
            <li>suivre d’un dossier</li>
            <li>modifier le commentaire</li>
            <li>changer de phase</li>
            <li>changer la prochaine action attendue de ?</li>
            <li>ajouter une saisine/avis CNPN/CSRPN (fichiers/dates)</li>
            <li>ajouter une décision administrative</li>
            <li>générer un document à partir des informations présentes dans Pitchou</li>
            <li>effectuer un contrôle</li>
            <li>demander une correction</li>
            <li>envoyer une demande de complément</li>
        </ul>
        <p>
            Pour chacune de ces activités, nous stockons l'instructrice qui a effectué l'action, 
            le type d'action, et la date à laquelle l'action a eu lieu (uniquement la date, pas l'heure).
        </p>

        <h4>Traitement</h4>
        <p>
            Les données d'instruction sont utilisées pour restituer aux instructrices leur travail sur le dossier.
            Occasionnellement, des statistiques anonymisées peuvent être produites sur l'ensemble des dossiers d'un service.
        </p>
        <p>
            Les données d'activités sont utilisées par l'équipe Pitchou pour nourrir la 
            <a href="https://doc.incubateur.net/communaute/gerer-son-produit/aide-a-la-mise-en-application-des-standards/pourquoi-le-deploiement-dun-service-public-en-ligne-est-il-important/methode-aarri">méthodologie AARRI</a>.
            Elles sont <a href="pitchou.beta.gouv.fr/aarri">agrégées sous forme d'indicateurs</a> pour comprendre l'évolution de l'usage de la plateforme Pitchou.
            Ces données peuvent aussi être réutilsées pour contacter les instructrices afin de mieux comprendre leur utilisation de la plateforme
        </p>

        <h4>Licéité</h4>
        <p>
            Les données et traitement d'instructions sont nécessaires à l'exécution du contrat 
            entre les instructrices et Pitchou
        </p>
        <p>
            Les données et traitements liés à l'activité sont nécessaires à l'exécution de la 
            mission de service publique poursuivie par l'équipe Pitchou
        </p>

        <h4>Durée de conservation</h4>
        <p>
            Les données liées à l'instruction sont conservées tout le long de l'instruction du dossier, 
            puis le temps de la durée de dérogation, 
            puis 5 ans après la clôture du dossier
        </p>
        <p>
            Les données d'activités sont supprimées 1 an après avoir été collectées
        </p>

        <h2>Protection des données personnelles</h2>
        <p>Les données personnelles sont stockées dans une base de données dont l'accès direct est restreint
            aux personnes compétentes à manipuler une base de données de l'équipe Pitchou.
        </p>
        <p>Les accès indirects aux données (via l'interface pitchou) ont lieu via connexion HTTPS 
            uniquement pour les personnes qui ont un droit d'accès</p>

        <h2>Exercice des droits</h2>
        <p>Vous pouvez demander à <a href="mailto:pitchou@beta.gouv.fr">l'équipe Pitchou</a> la suppression 
            de vos données personnelles</p>

        <h2>Délégué à la protection des données (DPO)</h2>
        <p>
            Au sein de l'équipe Pitchou, <a href="mailto:david.bruant@beta.gouv.fr">David Bruant</a> joue le 
            rôle de DPO. Vous pouvez le contacter pour toute demande liée aux données personnelles stockées 
            et traitées dans Pitchou
        </p>

    </div>
</Squelette>


