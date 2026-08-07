export const COLUMN_COMMENTS_CHUNK_3 = {
  evenement_metrique: {
    date: ["Date de l’évènement", "Evenement date"],
    evenement: ["Type de l’évènement", "Evenement type"],
    details: [
      "Données structurées liées donnant des détails sur l’évènement",
      "Related structured data providing details about the evenement",
    ],
  },
  notification: {
    updated_at: [
      "Date à laquelle la notification a été mise à jour pour la dernière fois",
      "Date on which the notification was last updated",
    ],
    viewed: [
      "Indique si la personne a consulté ou non la notification",
      "Indicates whether the personne has viewed the notification",
    ],
  },
  personne: {
    last_name: [
      "Nom de famille de la personne. Identité civile",
      "Personne last name. Civil identity",
    ],
    first_names: [
      "Prénoms de la personne. Identité civile",
      "Personne first names. Civil identity",
    ],
    email: [
      "Adresse email de la personne. Utilisée pour la communication, l'authentification et l'identification unique de l'utilisateur dans le système.",
      "Personne email address. Used for communication, authentication, and unique user identification in the system.",
    ],
    access_code: [
      "Code d'accès unique de la personne. Permet de récupérer un lot de capabilities dans la table, notamment dans la table arête_cap_dossier__groupe_nstructeur",
      "Unique access code of the personne. Used to retrieve a set of capabilities, particularly from the edge_cap_dossier__groupe_instructeurs table",
    ],
  },
  prescription: {
    decision_administrative: [
      "Référence vers la décision administrative associée à cette prescription. Une décision administrative peut contenir plusieurs prescriptions détaillant les obligations spécifiques à respecter.",
      "Reference to the decision administrative associated with this prescription. A decision administrative can contain several prescriptions detailing the specific obligations to fulfill.",
    ],
    due_date: [
      "Date limite à laquelle la prescription doit être respectée. Les contrôles de cette prescription s'effectuent dès lors que la date d'échéance est dépassée.",
      "Deadline by which the prescription must be fulfilled. Controles of this prescription are performed once the due date has passed.",
    ],
    article_number: [
      "Numéro de l'article de la prescription. Permet d'identifier et de référencer précisément la prescription dans le cadre de la décision administrative.",
      "Article number of the prescription. Used to identify and precisely reference the prescription within the decision administrative.",
    ],
    description: [
      "Description détaillée de la prescription. Explique précisément ce qui doit être fait, comment et dans quelles conditions pour respecter l'obligation imposée.",
      "Detailed description of the prescription. Explains precisely what must be done, how, and under what conditions to fulfill the imposed obligation.",
    ],
    avoided_surface: [
      "Surface en m² qui a été évitée grâce aux mesures de protection mises en place.",
      "Surface area in m² avoided through the implemented protection mesures.",
    ],
    compensated_surface: [
      "Surface en m² qui a été compensée pour atténuer les impacts du projet.",
      "Surface area in m² compensated to mitigate the project's impacts.",
    ],
    avoided_nids: [
      "Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été évités grâce aux mesures de protection mises en place.",
      "For a dossier impacting a bird espece. Number of nests avoided through the implemented protection mesures.",
    ],
    compensated_nids: [
      "Dans le contexte d'un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été compensés pour atténuer les impacts du projet.",
      "For a dossier impacting a bird espece. Number of nests compensated to mitigate the project's impacts.",
    ],
    avoided_individus: [
      "Nombre d'individus qui ont été évités grâce aux mesures de protection mises en place.",
      "Number of individus avoided through the implemented protection mesures.",
    ],
    compensated_individus: [
      "Nombre d'individus qui ont été compensés pour atténuer les impacts du projet.",
      "Number of individus compensated to mitigate the project's impacts.",
    ],
  },
} as const;
