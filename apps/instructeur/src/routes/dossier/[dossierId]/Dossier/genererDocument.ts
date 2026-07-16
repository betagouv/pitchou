import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
import { createEspecesGroupedByImpact } from "$lib/especes/creerEspecesGroupeesParImpact.ts";

import type {
  ActiviteMenancante,
  DescriptionMenacesEspeces,
  QuantifiedImpact,
} from "@pitchou/types/especes.d.ts";
import type { BalisesGenerationDocument } from "@pitchou/types/balisesGenerationDocument.d.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { EspecesByActivite } from "$lib/especes/creerEspecesGroupeesParImpact.ts";

/**
 * List of tags provided to the instructeur.i.ces.
 *
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export function getBalisesGenerationDocument(
  dossier: DossierFull,
  especesImpactees: DescriptionMenacesEspeces,
  identifiantPitchouVersActiviteEtImpactsQuantifies: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
  >,
): BalisesGenerationDocument {
  const {
    nom,
    commentaire_libre,
    date_debut_consultation_public,
    date_fin_consultation_public,
    description,
    date_dépôt,
    départements,
    enjeu,
    justification_absence_autre_solution_satisfaisante,
    mesures_erc_prévues,
    motif_dérogation,
    nombre_nids_compensés_dossier_oiseau_simple,
    nombre_nids_détruits_dossier_oiseau_simple,
    justification_motif_dérogation,
    date_début_intervention,
    date_fin_intervention,
    date_mise_en_service,
    durée_intervention,
    historique_identifiant_demande_onagre,
    activité_principale,
    rattaché_au_régime_ae,
    type,
    scientifique_type_demande,
    scientifique_bilan_antérieur,
    scientifique_finalité_demande,
    scientifique_description_protocole_suivi,
    scientifique_mode_capture,
    scientifique_modalités_source_lumineuses,
    scientifique_modalités_marquage,
    scientifique_modalités_transport,
    scientifique_périmètre_intervention,
    scientifique_intervenants,
    scientifique_précisions_autres_intervenants,
  } = dossier;

  // Transform the impacted espèces if they exist
  const especes_impacts: EspecesByActivite[] | undefined = createEspecesGroupedByImpact(
    especesImpactees,
    identifiantPitchouVersActiviteEtImpactsQuantifies,
  );

  const hirondelles: BalisesGenerationDocument["hirondelles"] =
    type === "Hirondelle"
      ? {
          nids_détruits: nombre_nids_détruits_dossier_oiseau_simple ?? null,
          nids_compensés: nombre_nids_compensés_dossier_oiseau_simple ?? null,
        }
      : undefined;

  const cigognes: BalisesGenerationDocument["cigognes"] =
    type === "Cigogne"
      ? {
          nids_détruits: nombre_nids_détruits_dossier_oiseau_simple ?? null,
          nids_compensés: nombre_nids_compensés_dossier_oiseau_simple ?? null,
        }
      : undefined;

  return {
    nom,
    commentaire_instruction: commentaire_libre?.trim() ?? "",
    date_début_consultation_public: date_debut_consultation_public,
    date_fin_consultation_public: date_fin_consultation_public,
    description,
    date_dépôt,
    département_principal: Array.isArray(départements) ? départements[0] : undefined,
    liste_départements: départements || undefined,
    enjeu,
    justification_absence_autre_solution_satisfaisante,
    mesures_erc_prévues: mesures_erc_prévues === null ? "Non renseigné" : mesures_erc_prévues,
    mesures_erc_prévues_renseigné: mesures_erc_prévues !== null,
    motif_dérogation,
    hirondelles,
    cigognes,
    justification_motif_dérogation,
    identifiant_onagre: historique_identifiant_demande_onagre,
    activité_principale,
    date_début_intervention,
    date_fin_intervention,
    date_mise_en_service,
    durée_intervention,
    demandeur: {
      adresse: dossier.demandeur_adresse,
      nom:
        dossier.demandeur_personne_morale_raison_sociale ||
        `${dossier.demandeur_personne_physique_prénoms} ${dossier.demandeur_personne_physique_nom}`,
      toString() {
        return formatPorteurDeProjet(dossier);
      },
    },
    localisation: formatLocalisation(dossier),
    régime_autorisation_environnementale_renseigné: rattaché_au_régime_ae !== null,
    régime_autorisation_environnementale:
      rattaché_au_régime_ae === null ? "Non renseigné" : rattaché_au_régime_ae,
    liste_espèces_par_impact: especes_impacts?.map(
      ({ espèces: especes, activité: activite, impactsQuantifiés: impactsQuantifies }) => ({
        liste_espèces: especes.map(
          ({
            nomVernaculaire,
            nomScientifique,
            détails,
            espèceCNPN: especeCNPN,
            espèceMinistérielle: especeMinisterielle,
          }) => ({
            nomVernaculaire,
            nomScientifique,
            liste_impacts_quantifiés: détails,
            estCNPN: especeCNPN,
            estMinistérielle: especeMinisterielle,
          }),
        ),
        impact: activite,
        liste_noms_impacts_quantifiés: impactsQuantifies,
      }),
    ),
    scientifique: {
      type_demande: scientifique_type_demande,
      bilan_antérieur: scientifique_bilan_antérieur,
      // @ts-expect-error json column, so type generation misunderstands it
      finalité_demande: scientifique_finalité_demande,
      description_protocole_suivi: scientifique_description_protocole_suivi,
      mode_capture: scientifique_mode_capture,
      modalités_source_lumineuses: scientifique_modalités_source_lumineuses,
      modalités_marquage: scientifique_modalités_marquage,
      modalités_transport: scientifique_modalités_transport,
      périmètre_intervention: scientifique_périmètre_intervention,
      intervenants: scientifique_intervenants,
      précisions_autres_intervenants: scientifique_précisions_autres_intervenants,
    },
    numéro_dossier: dossier.number_demarches_simplifiées,
    // deprecated
    identifiant_pitchou: dossier.id,
    //Functions
    afficher_nombre,
    formatter_date,
    formatter_date_simple,
  };
}

function afficher_nombre(n: any, precision: number = 2): string | undefined {
  if (typeof n === "string") {
    n = parseFloat(n);
  }

  if (typeof n === "number") {
    if (Number.isNaN(n)) {
      return "(erreur de calcul)";
    }

    if (Number.isInteger(n)) return n.toString(10);
    else {
      return n.toFixed(precision);
    }
  }

  return undefined;
}

function formatter_date(date: any, formatString: string): string | undefined {
  if (!date) return undefined;
  date = new Date(date);
  return format(date, formatString, { locale: fr });
}

function formatter_date_simple(date: any): string | undefined {
  return formatter_date(date, "d MMMM yyyy");
}
