import type { Knex } from "knex";

type TypeImpactRow = {
  identifiant_pitchou: string;
  code_europeen: string;
  classification: string;
  libelle_pitchou: string;
  libelle_europeen: string;
  activites_onagre: string[];
  critere_methode: boolean;
  critere_moyen_de_poursuite: boolean;
  critere_nombre_individus: boolean;
  critere_nids: boolean;
  critere_oeufs: boolean;
  critere_surface_habitat_detruit: boolean;
};

type ValeurCritereRow = {
  code: string;
  classification: string;
  libelle_pitchou: string;
  libelle_europeen: string;
};

export const TYPES_IMPACT: TypeImpactRow[] = [
  {
    identifiant_pitchou: "P-1",
    code_europeen: "1",
    classification: "oiseau",
    libelle_pitchou: "Destruction/mutilation de spécimens",
    libelle_europeen: "Tuer délibérément par n'importe quelle méthode",
    activites_onagre: ["Empoisonnement", "Destruction de spécimens", "Mutilation de spécimens"],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-2-1",
    code_europeen: "2",
    classification: "oiseau",
    libelle_pitchou: "Capture pour captivité temporaire ou définitive",
    libelle_europeen:
      "Capture délibérée par n'importe quelle méthode, avec l'intention de garder temporairement ou définitivement les spécimens capturés en captivité",
    activites_onagre: [
      "Capture de spécimens",
      "Capture pour conserver en captivité",
      "Sauvetage d'oiseaux blessés",
      "Capture pour utiliser comme appât/leurre",
    ],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: true,
    critere_oeufs: true,
    critere_surface_habitat_detruit: true,
  },
  {
    identifiant_pitchou: "P-2-2",
    code_europeen: "2",
    classification: "oiseau",
    libelle_pitchou: "Transport de spécimens vivants ou morts",
    libelle_europeen:
      "Capture délibérée par n'importe quelle méthode, avec l'intention de garder temporairement ou définitivement les spécimens capturés en captivité",
    activites_onagre: [
      "Transport de spécimens vivants en vue du relâcher dans la nature",
      "Transport de spécimens vivants d'un lieu de capture ou d'enlèvement vers un établissement",
      "Transport de spécimens vivants entre deux établissements",
      "Transport de spécimens morts (autres que naturalisés)",
      "Transport de spécimens naturalisés",
    ],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: true,
    critere_oeufs: true,
    critere_surface_habitat_detruit: true,
  },
  {
    identifiant_pitchou: "P-3",
    code_europeen: "3",
    classification: "oiseau",
    libelle_pitchou: "Capture/relâcher immédiat",
    libelle_europeen:
      "Capture délibérée par n'importe quelle méthode, suivie de leur libération immédiate des spécimens de capture dans un état sain et sauf",
    activites_onagre: ["Capture de spécimens", "Capture et marquage (baguage)", "Relâcher"],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-4-1",
    code_europeen: "4",
    classification: "oiseau",
    libelle_pitchou: "Destruction de nids/oeufs",
    libelle_europeen:
      "Destruction délibérée ou endommagement de leurs nids ou œufs ou élimination de leurs nids / ou destruction délibérée de sites de repos",
    activites_onagre: ["Destruction de nids", "Destruction d’œufs", "Enlèvement de nids"],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: false,
    critere_nids: true,
    critere_oeufs: true,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-4-2",
    code_europeen: "4",
    classification: "oiseau",
    libelle_pitchou: "Dégradation/destruction d’aires de repos/reproduction",
    libelle_europeen:
      "Destruction délibérée ou endommagement de leurs nids ou œufs ou élimination de leurs nids / ou destruction délibérée de sites de repos",
    activites_onagre: [
      "Altération d'aires de repos",
      "Altération de sites de reproduction",
      "Dégradation d'aire de repos",
      "Dégradation de sites de reproduction",
      "Destruction d'aires de repos",
      "Destruction de sites de reproduction",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: false,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: true,
  },
  {
    identifiant_pitchou: "P-5",
    code_europeen: "5",
    classification: "oiseau",
    libelle_pitchou: "Enlèvement d’oeufs (même vides)",
    libelle_europeen: "Prendre leurs œufs dans la nature et les garder même vides",
    activites_onagre: ["Enlèvement d’œufs"],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: false,
    critere_nids: false,
    critere_oeufs: true,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-6",
    code_europeen: "6",
    classification: "oiseau",
    libelle_pitchou: "Peturbation intentionnelle, effarouchement",
    libelle_europeen:
      "Perturbation délibérée, en particulier pendant la période de reproduction et d'élevage, dans la mesure où la perturbation serait importante au regard des objectifs de la directive",
    activites_onagre: [
      "Perturbation intentionnelle pendant la période d'élevage",
      "Perturbation intentionnelle pendant la période de reproduction",
      "Perturbation intentionnelle, effarouchement",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-7",
    code_europeen: "7",
    classification: "oiseau",
    libelle_pitchou: "Détention de spécimens vivants ou morts ou de matériel biologique",
    libelle_europeen:
      "La détention (spécimens vivants ou morts) d'oiseaux dont la chasse et la capture sont interdites",
    activites_onagre: [
      "Détention de spécimens vivants",
      "Détention de spécimens vivants en vue de la reproduction",
      "Détention de spécimens morts",
      "Naturalisation d'espèces",
      "Utilisation de spécimens vivants pour la fauconnerie",
      "Détention de matériels biologiques",
      "Enlèvement de matériels biologiques",
      "Utilisation de spécimens vivants pour la chasse",
      "Utilisation de matériels biologiques",
      "Prélèvement de matériels biologiques",
      "Utilisation de spécimen morts",
      "Utilisation de spécimens vivants",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-8",
    code_europeen: "8",
    classification: "oiseau",
    libelle_pitchou:
      "Pour l’achat ou la vente : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
    libelle_europeen:
      "Vente, transport en vue de la vente, conservation en vue de la vente et/ou mise en vente d'oiseaux vivants ou morts et/ou de toutes parties ou produits facilement reconnaissables de ces oiseaux\n(Attention ! Ce code 8 ne vise en fait que des activités de vente ; il ne faut pas y ranger les activités de détention ou de transport sans vente)\nIl s'agit de l'utilisation supposée d'une activité économique",
    activites_onagre: [
      "Achat de spécimens morts (spécimen d'espèces animales)",
      "Achat de spécimens vivants (spécimen d'espèces animales)",
      "Mise en vente de spécimens morts",
      "Mise en vente de spécimens vivants",
      "Vente de spécimens morts",
      "Vente de spécimens vivants",
      "Achat de matériels biologiques",
      "Vente de matériels biologiques",
      "Colportage de matériels biologiques",
      "Colportage de spécimen morts",
      "Colportage de spécimens vivants",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-10",
    code_europeen: "10",
    classification: "faune non-oiseau",
    libelle_pitchou: "Destruction/mutilation de spécimens",
    libelle_europeen:
      "Abattage délibéré de spécimens dans la nature dans les habitats – vocabulaire des principales activité\n\na) toute forme mise à mort intentionnelle de spécimens de ces espèces dans la nature;",
    activites_onagre: [
      "Destruction de spécimens",
      "Destruction de spécimens par empoisonnement",
      "Destruction délibérée de spécimens dans le milieu naturel",
      "Mutilation de spécimens",
    ],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-20",
    code_europeen: "20",
    classification: "faune non-oiseau",
    libelle_pitchou: "Capture pour captivité temporaire ou définitive",
    libelle_europeen:
      "Capture délibérée de spécimens dans la nature, avec l'intention de les garder temporairement ou définitivement en captivité dans le vocabulaire des activités principales\n\na) toute forme de capture intentionnelle de spécimens de ces espèces dans la nature;",
    activites_onagre: [
      "Capture de spécimens",
      "Capture pour conserver en captivité",
      "Ramassage délibéré dans le milieu naturel de spécimens",
      "Transport de spécimens vivants en vue du relâcher dans la nature",
      "Capture pour utiliser comme appât/leurre",
    ],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-30",
    code_europeen: "30",
    classification: "faune non-oiseau",
    libelle_pitchou: "Capture/relâcher immédiat",
    libelle_europeen:
      "Capture délibérée de spécimens dans la nature, suivie de leur libération immédiate à l'état intact dans le vocabulaire des activités principales des habitats\n\na) toute forme de capture intentionnelle de spécimens de ces espèces dans la nature;",
    activites_onagre: ["Capture et marquage (baguage)", "Capture de spécimens"],
    critere_methode: true,
    critere_moyen_de_poursuite: true,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-40",
    code_europeen: "40",
    classification: "faune non-oiseau",
    libelle_pitchou: "Peturbation, effarouchement",
    libelle_europeen:
      "Perturbation délibérée des spécimens, en particulier pendant la période de reproduction, d'élevage, d'hibernation et de migration dans les habitats vocabulaire des principales activités\n\nb) la perturbation intentionnelle de ces espèces notamment durant la période de reproduction, de dépendance, d'hibernation et de migration;",
    activites_onagre: [
      "Perturbation intentionnelle pendant la période d'élevage",
      "Perturbation intentionnelle pendant la période d'hibernation",
      "Perturbation intentionnelle pendant la période de migration",
      "Perturbation intentionnelle pendant la période  de reproduction",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-50",
    code_europeen: "50",
    classification: "faune non-oiseau",
    libelle_pitchou: "Destruction/enlèvement d’oeufs/pontes",
    libelle_europeen:
      "Destruction délibérée ou prélèvement d’œufs dans la nature dans les habitats vocabulaire des activités principales\n\nc) la destruction ou le ramassage intentionnels des oeufs dans la nature;",
    activites_onagre: [
      "Destruction délibérée d’œufs dans le milieu naturel",
      "Enlèvement délibéré d’œufs dans le milieu naturel",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-60",
    code_europeen: "60",
    classification: "faune non-oiseau",
    libelle_pitchou: "Dégradation/destruction d’aires de repos/reproduction",
    libelle_europeen:
      "Détérioration ou destruction des sites de reproduction ou des lieux de repos dans le vocabulaire des principales activités des habitats\n\nd) la détérioration ou la destruction des sites de reproduction ou des aires de repos.",
    activites_onagre: [
      "Destruction d'aires de repos",
      "Destruction de sites de reproduction",
      "Détérioration d'aires de repos",
      "Détérioration de sites de reproduction",
      "Altération d'aires de repos",
      "Altération de sites de reproduction",
      "Dégradation d'aire de repos",
      "Dégradation de sites de reproduction",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: false,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: true,
  },
  {
    identifiant_pitchou: "P-70-1",
    code_europeen: "70",
    classification: "faune non-oiseau",
    libelle_pitchou: "Détention de spécimens vivants ou morts",
    libelle_europeen:
      "Conservation (*), transport et vente ou échange, et mise en vente ou échange, de spécimens prélevés dans la nature dans les habitats vocabulaire des principales activités\n\n2. Pour ces espèces, les États membres interdisent la détention, le transport, le commerce ou l'échange et l'offre aux fins de vente ou d'échange de spécimens prélevés dans la nature, à l'exception de ceux qui auraient été prélevés légalement avant la mise en application de la présente directive. \n\n(*) : à lire au sens de la détention",
    activites_onagre: [
      "Conserver en captivité Détention de spécimens vivants Détention de spécimens morts   Détention de spécimens vivants en vue de la reproduction Achat de spécimens morts (spécimen d'espèces animales)",
      "Transport de spécimens morts (autres qu naturalisés) Transport de spécimens naturalisés",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-70-2",
    code_europeen: "70",
    classification: "faune non-oiseau",
    libelle_pitchou: "Transport de spécimens vivants ou morts",
    libelle_europeen:
      "Conservation (*), transport et vente ou échange, et mise en vente ou échange, de spécimens prélevés dans la nature dans les habitats vocabulaire des principales activités\n\n2. Pour ces espèces, les États membres interdisent la détention, le transport, le commerce ou l'échange et l'offre aux fins de vente ou d'échange de spécimens prélevés dans la nature, à l'exception de ceux qui auraient été prélevés légalement avant la mise en application de la présente directive. \n\n(*) : à lire au sens de la détention",
    activites_onagre: [
      "Transport de spécimens vivants d'un lieu de capture ou d'enlèvement vers un établissement",
      "Transport de spécimens morts (autres qu naturalisés)",
      "Transport de spécimens naturalisés",
      "Transport de spécimens vivants d'un lieu de capture ou d'enlèvement vers un établissement",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-70-3",
    code_europeen: "70",
    classification: "faune non-oiseau",
    libelle_pitchou:
      "Pour l’achat la vente ou l’échange : transport, conservation, d'oiseaux vivants ou morts et/ou de toutes parties ou produits",
    libelle_europeen:
      "Conservation (*), transport et vente ou échange, et mise en vente ou échange, de spécimens prélevés dans la nature dans les habitats vocabulaire des principales activités\n\n\n(*) : à lire au sens de la détention",
    activites_onagre: [
      "Vente de spécimens morts",
      "Vente de spécimens vivants",
      "Achat de spécimens morts (spécimen d'espèces animales)",
      "Achat de spécimens vivants (spécimen d'espèces animales)",
      "Échange",
      "Achat de matériels biologiques",
      "Vente de matériels biologiques",
      "Colportage de matériels biologiques",
      "Colportage de spécimen morts",
      "Colportage de spécimens vivants",
      "Mise en vente de spécimens morts",
      "Mise en vente de spécimens vivants",
      "Offrir à l'échange",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
  {
    identifiant_pitchou: "P-80",
    code_europeen: "80",
    classification: "flore",
    libelle_pitchou:
      "Cueillette, collecte, coupe, déracinement ou destruction délibérés de spécimens dans le milieu naturel",
    libelle_europeen:
      "Cueillette, collecte, coupe, déracinement ou destruction délibérés de plantes dans leur aire de répartition naturelle à l'état sauvage dans les habitats vocabulaire des principales activités\n\na) la cueillette ainsi que le ramassage, la coupe, le déracinage ou la destruction intentionnels dans la nature de ces plantes, dans leur aire de répartition naturelle;",
    activites_onagre: [
      "Altération",
      "Arrachage – Déracinage",
      "Coupe",
      "Cueillette",
      "Dégradation",
      "Destruction",
      "Enlèvement",
      "Mutilation",
      "Coupe délibérée dans le milieu naturel de spécimen",
      "Cueillette délibérée dans le milieu naturel de spécimen",
      "Déracinage délibéré dans le milieu naturel de spécimen",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: false,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: true,
  },
  {
    identifiant_pitchou: "P-90",
    code_europeen: "90",
    classification: "flore",
    libelle_pitchou:
      "Conservation, transport, vente, échange de spécimens vivants ou morts ou matériels biologiques",
    libelle_europeen:
      "Conservation, transport et vente ou échange et mise en vente ou échange de spécimens d'espèces végétales prélevés dans la nature dans les habitats vocabulaire des principales activités\n\nb) la détention, le transport, le commerce ou l'échange et l'offre aux fins de vente ou d'échange de spécimens desdites espèces prélevés dans la nature, à l'exception de ceux qui auraient été prélevés légalement avant la mise en application de la présente directive.",
    activites_onagre: [
      "Achat (« de spécimen végétaux »)",
      "Colportage",
      "Détention de spécimens morts ou de matériel végétal",
      "Détention de spécimens vivants",
      "Mise en vente",
      "Transport",
      "Utilisation",
      "Vente",
      "Achat de matériels biologiques",
      "Vente de matériels biologiques",
      "Détention de matériels biologiques",
      "Enlèvement de matériels biologiques",
      "Utilisation de matériels biologiques",
      "Prélèvement de matériels biologiques",
      "Utilisation de spécimen morts",
      "Utilisation de spécimens vivants",
    ],
    critere_methode: false,
    critere_moyen_de_poursuite: false,
    critere_nombre_individus: true,
    critere_nids: false,
    critere_oeufs: false,
    critere_surface_habitat_detruit: false,
  },
];

export const METHODES: ValeurCritereRow[] = [
  {
    code: "0",
    classification: "oiseau",
    libelle_pitchou: "Par une méthode sélective, non massive",
    libelle_europeen: "non concerné",
  },
  {
    code: "1",
    classification: "oiseau",
    libelle_pitchou:
      "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    libelle_europeen:
      "En ce qui concerne la chasse, la capture ou la mise à mort d’oiseaux dans le cadre de la présente directive, les États membres interdisent le recours à tous moyens, installations ou méthodes de capture ou de mise à mort massive ou non sélective ou pouvant entraîner localement la disparition d’une espèce, non listéesà l’annexe IV, point a) (cf liste ci-dessous)",
  },
  {
    code: "2",
    classification: "oiseau",
    libelle_pitchou:
      "Par une des méthodes suivantes : Collets, gluaux, hameçons, oiseaux vivants utilisés comme appelants aveuglés ou mutilés, enregistreurs, appareils électrocutants, sources lumineuses artificielles, miroirs, dispositifs pour éclairer les cibles, dispositifs de visée comportant un convertisseur d’image ou un amplificateur d’image électronique pour tir de nuit, explosifs, filets, pièges-trappes, appâts empoisonnés ou tranquillisants, armes semi-automatiques ou automatiques dont le chargeur peut contenir plus de deux cartouches.",
    libelle_europeen:
      "Utilisation de l’une des méthodes suivantes :\na)\n—\nCollets (à l’exception de la Finlande et de la Suède pour la capture de Lagopus lagopus lagopus et de Lagopus mutus au nord de 58° de latitude nord), gluaux, hameçons, oiseaux vivants utilisés comme appelants aveuglés ou mutilés, enregistreurs, appareils électrocutants,\n—\nsources lumineuses artificielles, miroirs, dispositifs pour éclairer les cibles, dispositifs de visée comportant un convertisseur d’image ou un amplificateur d’image électronique pour tir de nuit,\n—\nexplosifs,\n—\nfilets, pièges-trappes, appâts empoisonnés ou tranquillisants,\n—\narmes semi-automatiques ou automatiques dont le chargeur peut contenir plus de deux cartouches;",
  },
  {
    code: "10",
    classification: "faune non-oiseau",
    libelle_pitchou: "Par une méthode sélective",
    libelle_europeen: "non concerné",
  },
  {
    code: "11",
    classification: "faune non-oiseau",
    libelle_pitchou:
      "Par une autre méthode non-sélective, massive ou pouvant entraîner localement la disparition d’une espèce",
    libelle_europeen:
      "tout moyen indiscriminé susceptible de provoquer la disparition locale de populations de l’espèce non inscrites à l’annexe VI (a) de la directive de l’UE sur les habitats ou à l’appendice IV de la convention de Berne ou de perturber gravement ces populations dans le vocabulaire des méthodes d’habitat",
  },
  {
    code: "12",
    classification: "faune non-oiseau",
    libelle_pitchou:
      "Pour les mammifères, par l’une des méthodes suivantes : Animaux aveugles ou mutilés utilisés comme leurres vivants, magnétophones, appareils électriques et électroniques capables de tuer ou d’assommer, sources lumineuses artificielles, miroirs et autres dispositifs d’éblouissement, dispositifs pour éclairer les cibles, dispositifs de visée pour le tir de nuit comprenant une loupe électronique ou un convertisseur d’image, des explosifs, des pièges ou des filets non sélectifs selon leur principe ou leurs conditions d’utilisation, des arbalètes, des poisons et des appâts empoisonnés ou anesthésiques, des gazages ou des fumées, armes semi-automatiques ou automatiques avec un chargeur capable de contenir plus de deux cartouches de munitions",
    libelle_europeen:
      "Moyens non sélectifs\nMammifères : Animaux aveugles ou mutilés utilisés comme leurres vivants, Magnétophones, Appareils électriques et électroniques capables de tuer ou d’assommer, Sources lumineuses artificielles, Miroirs et autres dispositifs d’éblouissement, Dispositifs pour éclairer les cibles, Dispositifs de visée pour le tir de nuit comprenant une loupe électronique ou un convertisseur d’image, des explosifs, des pièges ou des filets non sélectifs selon leur principe ou leurs conditions d’utilisation, des arbalètes, des poisons et des appâts empoisonnés ou anesthésiques, des gazages ou des fumées, Armes semi-automatiques ou automatiques avec un chargeur capable de contenir plus de deux cartouches de munitions dans le vocabulaire habitatsmethods\n(annexe VI de la dir habitat et annexe IV convention de berne)",
  },
  {
    code: "13",
    classification: "faune non-oiseau",
    libelle_pitchou:
      "Pour les poissons, par l’une des méthodes suivantes : Explosifs, armes à feu, poisons, anesthésiques, électricité à courant alternatif, sources lumineuses artificielles",
    libelle_europeen:
      "Moyens non sélectifs, Poissons : Explosifs, Armes à feu, Poisons, Anesthésiques, Électricité à courant alternatif, Sources lumineuses artificielles dans le vocabulaire des habitatsmethods, convention de berne annexe IV",
  },
  {
    code: "14",
    classification: "faune non-oiseau",
    libelle_pitchou: "Pour les écrevisses, par l’une des méthodes suivantes :  Explosifs, poisons",
    libelle_europeen:
      "Moyens non sélectifs Écrevisses : Explosifs, Poisons dans le vocabulaire des habitatsmethods convention de berne annexe IV",
  },
];

export const MOYENS_DE_POURSUITE: ValeurCritereRow[] = [
  {
    code: "0",
    classification: "oiseau",
    libelle_pitchou: "Autre/aucune poursuite",
    libelle_europeen: "Autre",
  },
  {
    code: "1",
    classification: "oiseau",
    libelle_pitchou: "Avion",
    libelle_europeen: "Avion",
  },
  {
    code: "2",
    classification: "oiseau",
    libelle_pitchou: "Véhicule automobile",
    libelle_europeen: "Véhicule automobile",
  },
  {
    code: "3",
    classification: "oiseau",
    libelle_pitchou: "Bateaux propulsés à une vitesse supérieure à 5 km/h",
    libelle_europeen: "bateaux propulsés à une vitesse supérieure à 5 kilomètres par heure.",
  },
  {
    code: "4",
    classification: "oiseau",
    libelle_pitchou: "Bateaux propulsés à une vitesse supérieure 18 km/h en haute mer",
    libelle_europeen:
      "En haute mer, les États membres peuvent, pour des raisons de sécurité, autoriser l’usage de bateaux à moteur ayant une vitesse maximale de 18 kilomètres par heure.",
  },
  {
    code: "0",
    classification: "faune non-oiseau",
    libelle_pitchou: "Autre/aucune poursuite",
    libelle_europeen: "Autre",
  },
  {
    code: "1",
    classification: "faune non-oiseau",
    libelle_pitchou: "Aéronefs",
    libelle_europeen: "Aéronefs",
  },
  {
    code: "2",
    classification: "faune non-oiseau",
    libelle_pitchou: "Véhicules à moteur en mouvement",
    libelle_europeen: "Véhicules à moteur en mouvement",
  },
];

export async function up(knex: Knex) {
  await knex.schema.createTable("type_impact", function (table) {
    table.comment(
      "Types of impact a projet can have on a protected species, and the criteres that can " +
        "qualify each of them. 'Type d'impact' is called 'Activité' by the European Commission.",
    );

    table
      .text("identifiant_pitchou")
      .primary()
      .comment("Pitchou identifier, e.g. 'P-2-1' for 'Type d'impact'.");
    table
      .text("code_europeen")
      .notNullable()
      .comment(
        "Code used when reporting to the European Commission (HaBiDeS+). Not unique: P-70-1, " +
          "P-70-2 and P-70-3 are three Pitchou types reported under the single code 70.",
      );
    table
      .text("classification")
      .notNullable()
      .comment(
        "Living-being classification this type impact applies to: 'oiseau', 'faune non-oiseau' " +
          "or 'flore'. Also decides which methode and moyen_de_poursuite rows can qualify it.",
      );
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou.");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the activity in the European directive.");
    table
      .specificType("activites_onagre", "text[]")
      .notNullable()
      .defaultTo("{}")
      .comment(
        "Labels of the Onagre reference activities that correspond to this type impact. " +
          "Informative: it records how the Onagre vocabulary maps onto the Pitchou one.",
      );

    table
      .boolean("critere_methode")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a methode can qualify this type impact.");
    table
      .boolean("critere_moyen_de_poursuite")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a moyen de poursuite can qualify this type impact.");
    table
      .boolean("critere_nombre_individus")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of impacted individuals can be given.");
    table
      .boolean("critere_nids")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of nids can be given.");
    table
      .boolean("critere_oeufs")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of oeufs can be given.");
    table
      .boolean("critere_surface_habitat_detruit")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a destroyed habitat area, in m², can be given.");

    // The form always reads the types d'impact of a single classification at a time.
    table.index("classification");
  });

  await knex.schema.createTable("methode", function (table) {
    table.comment(
      "Methods used to reach the impacted species, offered when the type impact has " +
        "critere_methode.",
    );

    table.text("code").primary().comment("Method code from the European directive.");
    table
      .text("classification")
      .notNullable()
      .comment("Living-being classification this methode can qualify.");
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the method in the European directive");
  });

  await knex.schema.createTable("moyen_de_poursuite", function (table) {
    table.comment(
      "Means of pursuit used to reach the impacted species, offered when the type impact has " +
        "critere_moyen_de_poursuite. Holds no flore row: the directive defines none. Also called 'Transport'.",
    );

    table
      .text("code")
      .notNullable()
      .comment(
        "Means-of-pursuit code from the European directive. Not unique on its own: 0, 1 and 2 " +
          "each mean one thing in the Oiseaux directive and another in the Habitats directive.",
      );
    table
      .text("classification")
      .notNullable()
      .comment(
        "Living-being classification this moyen de poursuite can qualify: 'oiseau' or " +
          "'faune non-oiseau'. Part of the key, since it is what tells two identical codes apart.",
      );
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the means of pursuit in the European directive.");

    table.primary(["code", "classification"]);
  });

  await knex("type_impact").insert(TYPES_IMPACT);
  await knex("methode").insert(METHODES);
  await knex("moyen_de_poursuite").insert(MOYENS_DE_POURSUITE);
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("moyen_de_poursuite");
  await knex.schema.dropTableIfExists("methode");
  await knex.schema.dropTableIfExists("type_impact");
}
