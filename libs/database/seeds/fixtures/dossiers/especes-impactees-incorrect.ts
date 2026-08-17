/**
 * A deliberately faulty espèces impactées file, so the anomalies the import reports can be seen in
 * the interface without waiting for a real pétitionnaire to make the mistake.
 *
 * Written as raw spreadsheet cells rather than through the normal seed path: that one resolves
 * every espèce and every code against the référentiel and throws on anything it does not know,
 * which is exactly what we want to break here.
 *
 * The valid line comes last on purpose — it must still be imported and displayed, and the alert
 * must speak only of the others.
 */
export const SEED_FICHIER_ESPECES_INCORRECT = {
  dossier: "99000009",
  nom_fichier: "especes-impactees-avec-erreurs.ods",
  feuilles: {
    oiseau: {
      colonnes: [
        "CD_REF",
        "nombre individus",
        "nids",
        "surface habitat détruit",
        "identifiant pitchou activité",
        "code méthode",
      ],
      lignes: [
        // Ligne 2 — CD_REF absent du référentiel
        ["404404", "11-100", "", "", "P-4-2", ""],
        // Ligne 3 — type d'impact inconnu
        ["459478", "11-100", "", "", "P-99", ""],
        // Ligne 4 — code méthode inconnu
        ["459478", "11-100", "", "", "P-2-1", "42"],
        // Ligne 5 — une flore dans la feuille oiseau
        ["88560", "", "", "3000", "P-4-2", ""],
        // Ligne 6 — « nids » ne s'applique pas à P-4-2 : la valeur est ignorée, la ligne reste
        ["459478", "", "12", "4000", "P-4-2", ""],
        // Ligne 7 — correcte
        ["459478", "", "", "4000", "P-4-2", ""],
      ],
    },
  },
} as const;
