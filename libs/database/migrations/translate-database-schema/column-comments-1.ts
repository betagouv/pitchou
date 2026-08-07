export const COLUMN_COMMENTS_CHUNK_1 = {
  avis_expert: {
    expert: [
      "Instance consultée pour avis sur la dérogation (ex. : CSRPN, CNPN, autre autorité compétente).",
      "Authority consulted for an avis on the derogation (e.g. CSRPN, CNPN, or another competent authority).",
    ],
    saisine_date: [
      "Date à laquelle l'expert a été officiellement saisi pour avis.",
      "Date on which the expert was officially consulted for an avis.",
    ],
    saisine_fichier: [
      "Fichier transmis lors de la saisine de l'expert.",
      "Fichier sent when the expert was consulted.",
    ],
    avis: [
      "Nature de l'avis émis par l'expert (ex. : Favorable, Favorable sous conditions, Défavorable, Non renseigné).",
      'Nature of the avis issued by the expert (e.g. "Favorable", "Favorable sous conditions", "Défavorable", "Non renseigné").',
    ],
    avis_date: [
      "Date de formulation ou de réception de l'avis de l'expert.",
      "Date on which the expert's avis was issued or received.",
    ],
    avis_fichier: [
      "Fichier contenant l'avis formel de l'expert.",
      "Fichier containing the expert's formal avis.",
    ],
  },
  cap_annotation_write: {
    instructeur_id: [
      "Identifiant de l'instructeur.rice dans Démarches Simplifiées. Utile pour faire référence à l'instructeur.rice dans les appels API",
      "Démarches Simplifiées identifier of the instructeur. Used to refer to the instructeur in API calls",
    ],
  },
  capability_geomce: {
    secret: [
      "Cette table n'a qu'une seule ligne, une seule valeur",
      "This table has only one row and one value",
    ],
  },
  controle: {
    prescription: [
      "Référence vers la prescription associée à ce contrôle. Une prescription peut avoir plusieurs contrôles pour assurer le suivi de sa mise en œuvre.",
      "Reference to the prescription associated with this controle. A prescription can have several controles to track its implementation.",
    ],
    controle_date: [
      "Date et heure précise à laquelle le contrôle a été effectué. Permet de tracer la chronologie des vérifications et de planifier les contrôles futurs.",
      "Exact date and time when the controle was performed. Used to track the timeline of checks and schedule future controles.",
    ],
    result: [
      "Résultat du contrôle effectué. Pour le moment, c'est une chaîne libre. À terme, les valeurs pourront être standardisées (ex: Conforme, Non conforme, Conforme avec réserves, etc.) pour faciliter l'analyse et le reporting.",
      'Result of the controle. It is currently free text. Eventually, values may be standardized (e.g. "Conforme", "Non conforme", "Conforme avec réserves") to facilitate analysis and reporting.',
    ],
    comment: [
      "Commentaires détaillés de l'inspecteur sur le contrôle effectué. Peut inclure des observations sur l'état de mise en œuvre, des difficultés rencontrées, des recommandations, etc.",
      "Detailed inspector comments about the controle. May include observations about implementation status, difficulties encountered, recommendations, etc.",
    ],
    post_controle_action_type: [
      "Type d'action à entreprendre suite au contrôle. Pour le moment, c'est une chaîne libre. Exemples : email, courrier, etc.",
      "Type of action to take following the controle. It is currently free text. Examples: email, letter, etc.",
    ],
    post_controle_action_date: [
      "Date à laquelle l'action suite au contrôle a été effectuée. Elle est souvent égale à la date_contrôle, mais peut être différente si l'instructeur.rice ne fait pas les suites dans la foulée du contrôle",
      "Date on which the action following the controle was taken. It is often equal to controle_date, but may differ if the instructeur does not follow up immediately after the controle",
    ],
    next_due_date: [
      "Date de la prochaine échéance de contrôle programmée. Permet de planifier le suivi de la prescription et de prévoir un autre contrôle.",
      "Date of the next scheduled controle deadline. Used to plan prescription monitoring and another controle.",
    ],
  },
  decision_administrative: {
    dossier: [
      "Référence vers le dossier associé à cette décision administrative. Un dossier peut avoir plusieurs décisions administratives au cours de son instruction (ex: arrêté préfectoral, arrêté ministériel, etc.).",
      'Reference to the dossier associated with this decision administrative. A dossier can have several decisions administratives during its review (e.g. "arrêté préfectoral", "arrêté ministériel").',
    ],
    number: [
      "Numéro officiel de la décision administrative. Ce numéro est généralement attribué par l'administration et permet d'identifier formellement la décision dans les systèmes administratifs.",
      "Official number of the decision administrative. This number is generally assigned by the administration and formally identifies the decision in administrative systems.",
    ],
    type: [
      "Type de décision administrative. Peut être par exemple : Arrêté refus, Arrêté modification, Arrêté dérogation, Autre décision...",
      'Type of decision administrative. Examples include: "Arrêté refus", "Arrêté modification", "Arrêté dérogation", "Autre décision".',
    ],
    signature_date: [
      "Date de signature de la décision administrative par l'autorité compétente. Cette date marque l'entrée en vigueur de la décision et le début des obligations pour le bénéficiaire.",
      "Date on which the decision administrative was signed by the competent authority. This date marks the decision taking effect and the start of the beneficiary's obligations.",
    ],
    obligations_end_date: [
      "Date de fin des obligations imposées par la décision administrative. Cette date marque la fin de la période de validité de la décision et des prescriptions associées.",
      "End date of the obligations imposed by the decision administrative. This date marks the end of the decision's validity period and its associated prescriptions.",
    ],
    fichier: [
      "Référence vers le fichier contenant la décision administrative.",
      "Reference to the fichier containing the decision administrative.",
    ],
  },
} as const;
