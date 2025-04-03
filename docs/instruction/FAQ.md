# FAQ (issue des questions du webinaire du 04/10)
Quelle articulation avec GUN ENV pour éviter les doubles saisies ?

À ce jour, et temporairement, les instructeur·ices de Nouvelle Aquitaine saisissent à la main les dossiers en Autorisation Environnementale dans Démarches-simplifiées.
Le lien n’est pas encore fait avec GUNEnv, mais les discussions sont en cours.

    Quel calendrier de déploiement de Pitchou ?
    L’outil est utilisable dès maintenant, comme c’est déjà le cas pour la Nouvelle Aquitaine. Il sert de tableau de suivi des dossiers, pour les instructeurs et la hiérarchie, permet de les comptabiliser pour réaliser des stats simples…
    Des fonctionnalités sont ajoutées au fil de l’eau et des utilisations.

    Comment se fait le lien avec le CNPN ?
    À ce jour et en phase transitoire, le CNPN est saisi via Onagre.
    Des tests (concluants) de saisine du CNPN et du CSRPN NA sont en cours au premier semestre 2025.

    Que vont devenir les informations stockées actuellement sur Onagre ? Pendant combien de temps pourrons-nous les consulter ? Où vont-elles basculer sur Pitchou?
    À terme, les données présentes dans Onagre seront récupérées intégralement dans Pitchou. Vous pourrez les consulter sur Onagre tant que le trnasfert ne sera pas fait.
    De manière générale, Onagre ne sera pas supprimé tant que Pitchou ne permettra pas effectivement de le remplacer complètement.
    Pendant l’été 2024, les 1300 dossiers de la NA ont été récupérés sur Pitchou, ce qui a permis d’abandonner le tableau de suivi (Google Sheet partagé).

    D’où vient le nom Pitchou ?
    C’est la première espèce dont Vanessa nous a parlé et du coup c’est resté.

    Quid du démarrage, du délai légal, comment gérer la recevabilité et le temps d’instruction du dossier ?
    C’est en effet une discussion à avoir pour savoir où mettre le curseur pour passer de la phase amont à la phase d’instruction.
    Une proposition de phases est disponible ici : docs/instruction/phases-instructions.md
    Quant au délais légal, qui est particulièrement important dans le cas des dossiers en Autorisation environnemebtale, il démarre lorqsue le dossier est jugé complet et régulier et qu’il passe en phase d’instruction.

    La meessagerie de DS est-elle une messagerie de plus ou est-ce un relais de MEL ?

On est en train de tester la messagerie DS de manière pour voir s’il est pertinent de sortir des boites mail et d’intégrer cette messagerie dans l’interface Pitchou pour la suite.
On est sur une méthode itérative : Si après ces tests nous estimons la solution peu pertinente par rapport aux usages actuels alors nous abandonnerons cette fonctionnalité.

    Est-ce que Pitchou va remplacer Onagre
    Oui.
    Les deux fonctions incontournables d’onagre sont de :
        récupérer les données nécessaires au rapportage européen et saisir le CNPN. Dans la mesure où on remplace le CERFA papier par DS, notre objectif est de récupérer les données numériquement directement et de pouvoir produire le rapportage européen.
        L’objectif est de passer aussi par DS pour la saisine du CNPN.

    On n’a plus besoin de stocker les informations sur le réseau du coup ?
    C’est un choix personnel.
    On a fait en sorte de stocker les données saisies, les échanges et les saisines, etc.
    On a aussi prévu un bouton pour extraire et stocker ces informations sur un environnement du réseau (fréquence à définir individuellement).

    Y aura-t-il un suivi pour le retour des suivis et bilan ?
    On prévoit un module “Contrôle” dans Pitchou qui permet de les planifier aux périodes les plus pertinentes et de suivre la mise en oeuvre des prescriptions (suivis écologiques, mesures ERC…)

    Un BE peut-il me contacter facilement via la plateforme, ou doit-il demander au pétitionnaire l’identifiant/mdp pour accéder à la saisine ?
    Un BE peut déposer un dossier sur DS en tant que mandataire, pour le compte d’un pétitionnaire, puis il peut l’inviter sur le dossier via DS.

    Pouvez-vous montrer l’interface GeoMCE svp ? Peut-on faire une extraction par instructeur / département ?
    On a déjà eu plusieurs réunions avec les équipes GeoMCE pour que le lien se fasse de manière automatique. L’objectif est de nourrir GeoMCE avec les mesures ERC définies dans Pitchou.

    Demandez-vous aux pétitionnaires de déposer un pré-dossier dès les échanges de la phase amont ? Car si ce n’est pas le cas, on n’a pas tout l’historique des messages
    Oui c’est justement l’intention du formulaire DS que nous avons construit : déposer un dossier dès la phase amont, même avant de savoir si une DDEP est nécessaire.
    Le formulaire a été conçu avec la plupart des questions optionnelles, pour que les personnes puissent déposer un dossier le plus incomplet possible pour faciliter le démarrage de la phase amont.

    Est ce qu’avec le RGPD, Pitchou ne devra pas supprimer les dossiers tous les 5 ans ?
    Le RGPD parle spécifiquement de la protection des données des personnes physiques.
    Il y a un gros flou concernant les personnes morales.
    Il y a besoin pour des raisons légales de garder les dossiers qui ont été instruits et qui ont amené à un arrêté préfectoral. On doit garder le dossier aussi longtemps que l’arrêté peut-être attaqué.

    Un profil d’accès à Pitchou spécifique aux membres du CNPN est-il prévu ? Un membre du CNPN doit pouvoir suivre et accéder à un rapport de mise en oeuvre des mesures compensatoires.
    Oui, c’est quelque chose qu’on a en tête car c’est l’un des retours de la phase d’investigation. Une des envies qu’on a c’est de mieux créer cette connexion.

    **Avez-vous commencé à travailler à l’aboutissement au rapportage à la commission Européenne
    Oui car tous le formulaire de saisie des espèces à été construit pour que toutes les données attendues soient présentes.
    On a étudié aussi le format de données attendu par le rapportage européen.
    Ce qui manque, c’est de traduire ces données en un fichier XML attendu. C’est l’un des fonctionnalités prévues.

    Vous avez parlé de gérer les alertes contrôles/suivis écologiques , cComment cela se passe-t-il ?
    Ce sont les développements prévus pour le futur.
    C’est l’un des objectifs principal de pitchou.
    On pourrait avoir un outil de remplissage de plan de suivi écologique ou de la mise en oeuvre des compensations dans Pitchou pour produire un tableau à copier / coller dans les arrêtés. Et on pourra avoir des alertes en fonction de cette planification.
    On aimerait récupérer les échéances des dossiers passés pour pouvoir planifier les années à venir en fonction de ces dossiers déjà en cours.
    Nous avons une phase de développement d’un outil pour la récolte de données fiable.
    Ce qu’on s’est dit, c’est que créé un outil performant mais qui n’est pas bien utilisé/rempli par les instructeurs alors que ces données sont nécessaires pour le contrôle était contre productif.
    On n’a conscience qu’il nous faut un outil facile à remplir et accessible au quotidien.
    Une fois qu’on aura quelque chose de solide et validé par vous, l’idée est de pouvoir travailler sur la phase de contrôle.

    Peut-on avoir un aperçu du “tableau de bord” à disposition de l’encadrement pour visualiser l’ensemble des dossiers en instruction ?
    Le même tableau avec les mêmes filtres et fonctionnalités va servir aux deux. On va tester cette hypothèse.
    Et on va voir si c’est un outil qui permet au N+1 de travailler pour en retirer les données qui l’intéresse.
    Et si ce n’est pas le cas, on créera des fonctionnalités spécifiques.

    En cas de dossier incomplet, le pétitionnaire peut-il transmettre directement sur Pitchou ou sur le mail de l’instructeur?
    Aujourd’hui il n’y a rien d’obligatoire ou presque. Il peut déposer son dossier, ce qui ne veut pas dire qu’il est en instruction. Il peut ensuite le corriger autant de fois qu’il le veut. C’est l’objectif de la phase amont.
    Rentrer un dossier incomplet permet de suivre depuis la phase amont le traitement et de pouvoir valoriser le travail des instructeur·ices en phases amont.

    Sera t-il possible de faire des requêtes par espèce France entière par exemple ?
    Oui techniquement, mais là ça ne va pas être la priorité.

    Un module suivi est aussi présent dans GeoMCE. N’y a-til pas des redondances ?
    Oui complètement mais GéoMCE reste peu rempli, notamment car ce n’est pas un outil du quotidien pour les instructeur·ices. C’est un peu pour ça que l’on s’est dit qu’il fallait d’abord se concentrer sur saisir les données en amont pour arriver vers un outil de contrôle, sans passer par un outil annexe.
    Quand toutes les données seront saisies dans Pitchou et qu’on alimentera GeoMCE, on pourra voir si l’outil de suivi des contrôles de GeoMCE à partir de données fiables est efficace et répond au besoin ou si on doit intégrer ces fonctionnalités dans Pitchou. Quitte à renvoyer les données dans l’outil GeoMCE par la suite.

    Des liens avec Licorne également ?
    Ça sera peut-être plus compliqué avec Licorne car on attend que ça se stabilise aussi de leur côté pour commencer à parler avec eux.

    Par expérience d’une autre démarche sous Démarches Simplifiées, le RGPD oblige à archiver les dossiers de plus de trois ans. Je vois mal comment ce délai va rester compatible avec le délai de traitement des autorisations espèces pro, ni avec la durée de vie des installations (environ 30 ans). Est ce que vous leur avez posé la question ?
    On va sortir les dossiers de DS et les stocker de manière autonome dans notre propre environnement.
    DS est l’interface avec les petitionnaires mais nous sommes responsables des données saisies.
    On récupère pour le moment les données toutes les 10 minutes.
    Pour le RGPD on est dans le cas particulier des données de personnes morales et dans ce cas RGPD ne s’applique pas.
    On a besoin de garder les dossiers en cas de contentieux.

    La base de données espèces sera-t-elle à compléter dans chaque région pour les espèces protégées locales ?
    On récupère la TAXREF auprès du Muséum d’Histoire Naturelle mise à jour tous les ans.
    On a mis toutes les espèces protégées de TAXREF.
    Dans l’outil de saisie pitchou on a aussi récupéré les groupes d’espèces d’Onagre, qui peuvent être pas région ou par département.
    On propose une auto complétion par le nom scientifique ou vernaculaire.

    Est-il prévu que les espèces présentes sur le projet, renseigné dans Pitchou alimente le SINP national (avec bien entendu une redescente du national au régional de ces données) ?
    C’est une chose via le lien aves Depobio, mais pas priorisée à ce stade.

    La DEB pourra-t-elle avoir une saisie de dossier pour l’ensemble du territoire national et pour l’ensemble de la faune existante ?
    Oui, on peut faire un groupe France Entière ou un Groupe DEB auquel on pourra attribuer ces dossiers.

    Dans le cas de projets impactant des espèces protégées avec compétences ministérielles et préfectorale, est-ce que DS permet de faire deux types d’arrêtés (ministériel et préfectoral en discriminant les espèces qui appartiennent à l’un ou à l’autre) ?
    Il suffit qu’on fasse le lien entre TAXREF et le statut de l’espèce.
    On pourra avoir une alerte pour les espèces qui sont de compétence CNPN ou ministérielle.
    Il n’y a pas de problématique technique à le faire.

    N’est-il pas prévu de créer des onglets à compléter, de manière à ce que le pétitionnaire n’oublie pas des éléments essentiels (joindre la cartographie des nids d’oiseaux impactés et des nids compensatoires, données bibliographiques existantes, zonages environnementaux, matériel employé pour la méthodologie inventaires, conditions météorologiques d’observation…)
    On ne pourra pas couvrir tous les cas et tous les types de dossiers à travers un formulaire DS.
    Cela dit, on l’a adapté pour les dérogations scientifiques, les destructions de nids d’Hirondelles ou de Cigognes et les suivis mortalité dans les parcs éoliens.
    Si des besoins partagés remontent sur d’autres types de dossiers, nous pourrons à nouveau adapter le formulaire, mais il est déjà très loiurd à ce stade.

    Le formulaire démarche-simplifiée que vous avez créé pour la Dordogne devra être cloné pour les autres départements /Régions pour être utilisé ?
    Non tout le monde utilise le même puis on peut créer des groupes d’instructeur·ices pour que les dossiers soient rédirigés vers les bonnes personnes.

    Y aura -'il une assistance au niveau national pour répondre aux questions des pétitionnaires au sujet de DS ?
    L’équipe Pitchou se charge du support.

    Pourra-t-on saisir pour avis l’OFB , le CBNBP ou autres organismes via pitchou ou passer par mail ?
    On peut demander l’avis d’experts dans DS à partir d’une adresse mail. L’idée est de tout centraliser et de ne pas sortir de l’outil.

    Le suivi de l’instruction DDEP permet-il de rendre compte de la vie du dossier autre que l’instruction (contentieux…) ?
    Oui tout à fait, le suivi des phases est prévue, ainsi que pour le contrôle par la suite cf : docs/instruction/phases-instructions.md.

    Est-ce que vous avez commencé à travailler au rapportage de la commission européenne
    Tout le formulaire de saisie des espèces a été conçu avec toutes les données nécessaires au rapportage européen.
    On a aussi étudié le format de données attendues par le raportage.
    On a donc construit les données pour que ça corresponde.
    Ce qui manque, c’est le morceau de code qui extrait les données de la base de données Pitchou en un fichier xml attendu par le rapportage européen.

    Peut-on saisir l’avis de la DREAL via Pitchou ?
    Oui, tout comme la saisie des experts.

    Les consultations (CSRPN / CNPN) passent ou passeront par démarches simplifiées. L’avis produit en retour est-il stocké dans Pitchou ?
    Tout à fait. Les échanges seront faits via l’onglet “avis d’expert” et donc stockés.

    Si démarche simplifiée indique au porteur de projet qu’une DEP ne semble pas nécessaire, est-ce que le service instructeur reçoit les éléments de la saisie ?
    Oui tout à fait, l’idée est de pouvoir aussi suivre ces demandes. Mais le pétitionnaire doit déposer la demande. Et le formulaire démarches-simplifiées n’est volontairement pas conclusif.

    Comment se passe l’affectation d’un dossier à un instructeur ?
    C’est une fonctionnalité de DS où les administrateurs peuvent affecter des dossiers avec des instructeurs. A terme cette fonctionnalité sera intégrée au tableau de bord de Pitchou.

    On peut faire en sorte de bloquer le dépôt du dossier s’il manque des infos (la liste d’espèces par exemple) ?
    Ce n’est pas vraiment dans la philosophie du produit. L’idée est plutôt de demander des compléments si besoin plutôt que de bloquer le dépôt.

    Si je comprends bien, l’ensemble des échanges doivent se faire sur mes démarches simplifiées ?
    Oui, modulo la messagerie cf plus haut, dont l’utilisation est encore en test.

    Est-ce que Démarches simplifiée garde un historique des dossiers ?
    Oui, pendant 5 ans le temps de l’instruction. Après ça, Pitchou recupère automatiquement les données qui sont stockées aussi longtemps que nécessaire.

    Est-ce que l’outil Démarches simplifiés permet une instruction conjointe entre plusieurs Régions ? ou est-ce un outil DS par région ?
    DS permet pour le même formulaire qu’il y ait plusieurs groupes d’instructeurs. Nous avons décidé qu’il y ait un groupe par unité administrative pertinente.
    Et on va ajouter un groupe pour les dossiers interrégionaux.
    Les instructeur·ices seront invité·es à ce groupe le temps que vous avez un dossier inter-régionnal.
    S’il est nécessaire de faire des groupes plus fins parce qu’il existe beaucoup de dossiers partagés entre plusieurs régions.
    Il faut créer un groupe dans DS pour traiter ce cas.

    Est-ce qu’un courrier d’accusé de réception du dossier complet sera généré par pitchou ou envoyé par mail au demandeur afin de faire partir le délai de 4 mois d’instruction de la demande?
    Dans DS, il est possible de configurer l’email qui est envoyé lorsque le dossier est passé en instruction, donc on peut utiliser ça pour fournir une information sur le délai.

    Quel impact légal sur l’instruction si le pétitionnaire ne passe que par GUN ENV sans remplir Pitchou? La conséquence sera-t-elle uniquement un manque de visibilité pour le suivi stat ?
    A ce stade, en absence de lien entre GUNEnv et Pitchou, le pétitionnaire DOIT passer par GUNEnv et l’instructeur remplir Pitchou.
   
